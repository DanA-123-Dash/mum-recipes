# Status — Mum's Recipe Book

_Last updated: 2026-05-31_

---

## Active Sprint & Focus

**Phases 1 and 2a are live; Phase 2b is partial.** Ingestion pipeline, GitHub Action sync, PWA shell, allergen interstitial, service-worker caching, wake-lock, fractions formatter, profile switcher, and star-rating cook log are all shipped. The daily `Sync Sheet → data.json` workflow has been green on every recent run.

**Next:** small Phase 2b/3 completion sprint to close the gaps the PWA still lacks — most visibly air-fryer toggle (data already in the Sheet at column AL) and a real **cook mode** (button + visible wake-lock state + step strike-through).

---

## Plan Ledger

| Phase | Description | Status |
|---|---|---|
| Phase 1a | Schema, extraction prompt, ingestion script | ✅ Complete |
| Phase 1b | Pipeline hardening (fuzzy dedup, terminal review, HEIC, auto mode) | ✅ Complete |
| Phase 2a | GitHub repo · GitHub Action → `data.json` · PWA fetches static JSON | ✅ Complete |
| Phase 2b | Service worker · Allergen UI · Air fryer toggle · Serves adjuster | 🟡 Partial — SW + allergen done; air fryer + serves outstanding |
| Phase 3 | Kitchen UI — wake lock, fractions, crossing off | 🟡 Partial — wake-lock request + fractions done; cook-mode toggle + tap-to-strike outstanding |
| Phase 4 | Cloudflare Worker (shopping list) · Web Share API | Pending |

---

## Verified shipped (evidence in repo)

| Feature | Evidence |
|---|---|
| Sheet → `data.json` daily sync | `.github/workflows/sync-sheet.yml` + `scripts/export_sheet.py`; latest run 2026-05-31 ✅ |
| Service worker (cache-first shell + network-first data + cache-first images) | `sw.js` — `SHELL_CACHE` / `DATA_CACHE` / `IMAGE_CACHE` strategies |
| PWA install scaffolding | `manifest.json`, `<link rel="manifest">` in `index.html` |
| Allergen interstitial UI | `index.html` `.allergen-overlay` modal + flagged-card styling |
| Wake-lock request | `index.html` — `navigator.wakeLock.request('screen')` call site |
| Fractions formatter | `index.html` — `FRACTIONS` map used in quantity rendering |
| Profile switcher (mum / dan) | `index.html` — `PROFILES` map with `hideMeat: true` for mum profile |
| Star ratings + cook log | `index.html` — `.star-btn` UI + `submitLog()` handler |
| Image lazy loading | `index.html` — `loading="lazy"` on recipe images (×3) |

---

## Still outstanding (Phase 2b / 3 / 4)

### Phase 2b gaps
- **Air-fryer toggle** — column AL `method_air_fryer_json` is captured during ingestion but never read by the PWA. Needs a UI toggle on the recipe view to swap the steps list when air-fryer steps are present.
- **Serves multiplier** — `r.serves` is rendered as a display badge (👥 N) only. No ± controls; ingredient quantities don't recompute.

### Phase 3 gaps
- **Cook mode** — wake-lock request exists somewhere in code but isn't tied to a visible toggle. Needs a clear `Cook mode` button that (a) requests the screen wake-lock, (b) bumps font sizes / hides chrome, (c) enables ingredient + step tap-to-strike-through. `classList.toggle` is currently only used for star buttons, not list items.
- **Step / ingredient tap-to-cross-off** — not wired.

### Phase 4
- **Shopping list / multi-recipe basket** — no `navigator.share` or basket state in the PWA today.
- **Cloudflare Worker** — not started; only needed if the shopping list needs server-side persistence (an iPad-local basket would not require it).

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
