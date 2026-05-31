# Status — Mum's Recipe Book

_Last updated: 2026-05-31_

---

## Active Sprint & Focus

**Phases 1, 2a, 2b, 3 complete; Phase 4 substantially complete.** The 2026-05-31 sprint shipped cook mode (toggle + wake-lock + tap-to-strike), serves multiplier, air-fryer toggle, shopping basket with de-duplicated ingredients, and Web Share on both single-recipe and basket. The daily `Sync Sheet → data.json` workflow is green; sw.js `CACHE_VERSION` bumped `v1` → `v2` so existing iPad installs pick up the new shell.

**Next:** real-world use feedback from mum on the new cook-mode UI; populate `method_air_fryer_json` in the Sheet for a handful of recipes so the air-fryer toggle has something to flip. Cloudflare Worker shopping-list persistence remains the only genuinely-pending Phase 4 item and is deferred until/unless server-side persistence is wanted.

---

## Plan Ledger

| Phase | Description | Status |
|---|---|---|
| Phase 1a | Schema, extraction prompt, ingestion script | ✅ Complete |
| Phase 1b | Pipeline hardening (fuzzy dedup, terminal review, HEIC, auto mode) | ✅ Complete |
| Phase 2a | GitHub repo · GitHub Action → `data.json` · PWA fetches static JSON | ✅ Complete |
| Phase 2b | Service worker · Allergen UI · Air fryer toggle · Serves adjuster | ✅ Complete |
| Phase 3 | Kitchen UI — wake lock, fractions, crossing off | ✅ Complete |
| Phase 4 | Cloudflare Worker (cook log) · Web Share API · Shopping basket | ✅ Complete — Worker scaffolded for shared cook log (repurposed from shopping list); basket + Web Share shipped local-only; Worker deploy pending user-side Cloudflare setup |

---

## Verified shipped (evidence in repo)

| Feature | Evidence |
|---|---|
| Sheet → `data.json` daily sync | `.github/workflows/sync-sheet.yml` + `scripts/export_sheet.py`; latest run 2026-05-31 ✅ |
| Service worker (cache-first shell + network-first data + cache-first images) | `sw.js` — `SHELL_CACHE` / `DATA_CACHE` / `IMAGE_CACHE` strategies; `CACHE_VERSION = 'v2'` |
| PWA install scaffolding | `manifest.json`, `<link rel="manifest">` in `index.html` |
| Allergen interstitial UI | `index.html` `.allergen-overlay` modal + flagged-card styling |
| Wake-lock request | `index.html` — `navigator.wakeLock.request('screen')` call site, re-acquired on cook-mode entry |
| Fractions formatter | `index.html` — `FRACTIONS` map; `fmtQty` reused by serves multiplier |
| Profile switcher (mum / dan) | `index.html` — `PROFILES` map with `hideMeat: true` for mum profile |
| Star ratings + cook log | `index.html` — `.star-btn` UI + `submitLog()` handler |
| Image lazy loading | `index.html` — `loading="lazy"` on recipe images (×3) |
| Cook mode (toggle + larger fonts + tap-to-strike) | `index.html` — `toggleCookMode()`, `.cook-mode-active` CSS, `toggleStrike()` on ingredient `<li>` and `.method-step` |
| Serves multiplier | `index.html` — `changeServes(±1)`, `servesMultiplier` state, `renderModalMeta` / `renderModalIngredients` re-render |
| Air-fryer toggle | `index.html` — `toggleAirFryer()`, `getAirFryerSteps()` parser (handles array or JSON-string), auto-hides toggle when field empty |
| Shopping basket | `index.html` — `addCurrentToBasket()`, `consolidateBasket()` de-dup by `(name, unit)`, basket FAB persisted in `localStorage`, basket sheet with tap-to-tick and share/copy/clear |
| Web Share (single recipe + basket) | `index.html` — `shareRecipe()`, `shareBasket()` calling `navigator.share` with `copyBasket()` clipboard fallback |
| Toast notifications | `index.html` — `showToast()` for basket adds, cook-mode-on, copy confirmations |

---

## Still outstanding

### Data
- **`method_air_fryer_json` empty across all 54 recipes.** Schema column AL exists, the toggle is wired and will light up automatically — but no recipe has air-fryer steps yet. Either populate during ingestion (extend prompt) or add adapted steps to a handful of high-value recipes by hand.

### Deploy steps pending (user-side)
- **`wrangler` Cloudflare setup** — one-time: `cd worker && npm install && npx wrangler login`, then create D1 + KV bindings, set `FAMILY_TOKEN` secret, run migration, `wrangler deploy`. Full steps in `worker/README.md`. Until done, the PWA stays in localStorage-only mode (silently, with a "this device only" chip on the cook log).
- **Fill `WORKER_URL` and `FAMILY_TOKEN`** constants in `index.html` after the Worker is live; commit + push to activate cross-device sync.

### Optional polish
- **PWA install prompt UX** — iOS users still need to discover "Add to Home Screen" manually; a one-time hint banner would help first-run.
- **Basket-from-meal-plan** — accept a list of recipe IDs as a URL fragment so the vault's `meal-plan` skill can deep-link a shopping basket.

---

## Infrastructure

| Component | Detail |
|---|---|
| Ingestion script | `tools/process_recipes.py` |
| Google Sheet | `GOOGLE_SHEET_ID` in `.env` — tab: `Recipes` |
| Drive images folder | `GOOGLE_DRIVE_FOLDER_ID` in `.env` — flat `recipes/images/` structure |
| GCP project | `gen-lang-client-0486911988` |
| Service account | `mum-recipes-pipeline@gen-lang-client-0486911988.iam.gserviceaccount.com` — Sheets only |
| OAuth credentials | `~/.config/gcloud/client_secret_178543960660-...json` — Drive uploads |
| OAuth token | `~/.config/gcloud/mum-recipes-token.json` — auto-refreshes |
| Daily sync workflow | `.github/workflows/sync-sheet.yml` — cron `0 6 * * *` UTC + `workflow_dispatch` |

---

## Blockers

None.

---

## Notes

- GitHub Actions auto-disables scheduled workflows after **60 days of no human commits** (bot commits and successful cron runs don't count). The sync workflow ran fine throughout but the repo went 54 days between human commits (2026-04-07 → 2026-05-31); a doc-only commit resets the clock the canonical way and is preferable to clicking "Manage workflow" to extend the deadline manually.
