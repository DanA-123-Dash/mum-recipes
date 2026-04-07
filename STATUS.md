# Status — Mum's Recipe Book

_Last updated: 2026-04-07_

---

## Active Sprint & Focus

**Phase 1 complete.** Ingestion pipeline is functional end-to-end.

- 5 HEIC images processed → 6 recipes written to Google Sheet + Drive
- Header row added to Sheet (38 columns A–AL)
- Pipeline ready for bulk ingestion of remaining recipe clippings

**Next: Phase 2** — GitHub repo + static data pipeline + PWA core

---

## Plan Ledger

| Phase | Description | Status |
|---|---|---|
| Phase 1a | Schema, extraction prompt, ingestion script | ✅ Complete |
| Phase 1b | Pipeline hardening (fuzzy dedup, terminal review, HEIC, auto mode) | ✅ Complete |
| Phase 2a | GitHub repo · GitHub Action → `data.json` · PWA fetches static JSON | Pending |
| Phase 2b | Service worker · Allergen UI · Air fryer toggle · Serves adjuster | Pending |
| Phase 3 | Kitchen UI — wake lock, fractions, crossing off | Pending |
| Phase 4 | Cloudflare Worker (shopping list) · Web Share API | Pending |

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

---

## Blockers

None.
