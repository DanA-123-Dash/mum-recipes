# Architecture — Mum's Recipe Book

Technical decisions, patterns, and quirks discovered during implementation.

---

## Cook log: Cloudflare Worker + D1

Multi-device cook-log visibility (mum's iPad ↔ Dan's Mac) is implemented as a small Worker in `worker/` backed by a Cloudflare D1 SQLite database. The PWA at build-time has a `WORKER_URL` and `FAMILY_TOKEN` constant near the top of the `<script>` block; if both are empty the cook log silently falls back to localStorage-only mode (per-device, no sync) and shows a `· this device only` chip on the Cook Log title.

**Why D1 not KV:** D1 is queryable (e.g. "all of mum's 5★ recipes") with negligible overhead at this dataset size; KV would have forced us to design key schemes around each query.

**Idempotency via `client_id`:** the PWA generates a UUID per submit (`crypto.randomUUID()`), keeps the entry in localStorage with `pendingSync: true`, and POSTs. The Worker's D1 table has `client_id TEXT NOT NULL UNIQUE`; a retry with the same `client_id` returns 200 (not 201) and the existing row. This makes offline submit + later replay safe with no dedup logic on the client.

**Cache reconciliation:** `fetchCookLogForRecipe(recipe)` pulls the server truth at `openRecipe` time, merges it into the local `cook_log` array (server entries replace the cached set for that recipe; any `pendingSync` entries are preserved), and re-renders. Network failures leave the local cache untouched so the modal still renders something.

**Pragmatic auth:** a shared `FAMILY_TOKEN` set via `wrangler secret put` and hardcoded in `index.html`. Visible to anyone viewing source — that's fine because the blast radius is "spam cook log entries", and the real defences are (a) CORS allowlist on `ALLOWED_ORIGINS` (only the published GitHub Pages origin gets `Access-Control-Allow-Origin`), (b) per-IP rate limiting via a KV counter at 60 req/min, (c) Cloudflare's edge-level DDoS protection. No real auth, no per-profile scoping — at family scale, "anyone can delete anything" is the right model.

**Boot replay & legacy backfill:** on every `init()`, `flushPendingCookLogs()` retries any entries left `pendingSync: true`, and `backfillLegacyCookLog()` stamps pre-Worker entries (no `clientId`) and POSTs them once. A `cook_log_backfilled` localStorage flag prevents the backfill running twice.

---

## Auth Split: Service Account (Sheets) vs OAuth (Drive)

Service accounts cannot own files on personal Google Drive — they have no storage quota,
even when the target folder is shared with the service account as Editor. The result is a
`403 storageQuotaExceeded` error on every file upload.

**Pattern established:**
- **Sheets API** → service account credentials (`GOOGLE_APPLICATION_CREDENTIALS`)
- **Drive API** → OAuth 2.0 user credentials (`GOOGLE_OAUTH_CREDENTIALS` + token cache)

Token is saved to `~/.config/gcloud/mum-recipes-token.json` after first browser auth and
auto-refreshes via refresh token. Scope is `drive.file` (only files created by this app).

---

## Extraction Prompt: Always Include a Concrete JSON Example

Prose rules alone (e.g. "return nested objects") cause schema drift across Claude API calls.
Some calls return `source` as a plain string, others as a dict; `extraction_confidence` at
top-level in some calls, inside `meta` in others.

**Fix:** The prompt includes a complete example record showing exact nesting. This produces
consistent structure across calls. Defensive `_d()` helpers in `build_row` and `print_preview`
catch any residual drift.

---

## HEIC Conversion

iPhone photos are HEIC format. Claude Vision API does not accept HEIC. Conversion via macOS
`sips` (no extra dependencies):

```bash
sips -s format jpeg -s formatOptions 80 -Z 1600 input.heic --out output.jpg
```

- Quality 80% + max 1600px keeps files well under the 5 MB API limit
- Temp file created, used for extraction and Drive upload, then deleted
- Original HEIC moved to `processed/` after successful write

---

## Schema: Column Map

38 columns A–AL in the `Recipes` tab. Notable non-obvious entries:

| Column | Field | Notes |
|---|---|---|
| R | hazelnut | Explicit for Cat's allergy — always TRUE/FALSE, never blank |
| S | brazil_nut | Explicit for Cat's allergy — always TRUE/FALSE, never blank |
| AK | image_hash | Present but unused — architect mandated fuzzy title matching instead of MD5 |
| AL | method_air_fryer_json | Added beyond original spec — JSON array of adapted steps, or `[]` |

---

## Cuisine / Category Inference

Claude sometimes returns `null` for `cuisine_primary` and `category`. Post-extraction
`infer_fields()` keyword-matches against title + ingredient names. Order matters —
more specific cuisines checked first, `british` is the catch-all last entry.

---

## Drive Image Structure

Flat: `recipes/images/{slug}.jpg` — all images in one folder regardless of category.
This prevents broken links if recipes are recategorised later. `GOOGLE_DRIVE_FOLDER_ID`
points directly to the `images/` folder.

---

## Running the Pipeline

```bash
cd "01_Active Projects/07_Mum Recipes App/tools"
# Interactive (review each recipe):
python3 process_recipes.py

# Bulk / auto mode (no approval prompts):
python3 process_recipes.py --auto
```

`.env` at `My Drive/` root is auto-discovered by `load_dotenv()` when running from `tools/`.
