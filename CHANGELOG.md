# Changelog — Mum's Recipe Book

All notable changes will be documented here.

---

## [2026-05-31]

### Added — Phase 2b / 3 / 4 completion sprint
- **Cook mode** — toggle on the recipe modal that bumps font sizes and enables tap-to-strike-through on ingredients and method steps. Wake-lock is re-requested on entry.
- **Serves multiplier** — ± controls inline in the meta row; ingredient quantities rescale via existing `FRACTIONS` formatter. Re-renders meta + ingredients without re-opening the modal.
- **Air-fryer toggle** — pill next to the Method heading that swaps the steps list to `method_air_fryer_json` when populated. Auto-hides when the field is empty so the UI lights up as data arrives.
- **Shopping basket** — multi-recipe basket persisted in `localStorage`. Floating FAB shows count; bottom sheet de-duplicates ingredients by `(name, unit)` and sums compatible quantities. Share via `navigator.share`, copy to clipboard fallback, tap to tick off items.
- **Web Share — single recipe** — share button on the recipe modal that calls `navigator.share` with title + scaled ingredients + (air-fryer-aware) method, falling back to clipboard.
- **Toast notifications** — for basket adds, cook-mode-on, copy confirmations.

### Changed
- `fmtIngredient(ing)` → `fmtIngredient(ing, multiplier = 1)` and new `scaleIngredientPlain(ing, multiplier)` for non-HTML output (share/copy).
- `openRecipe` refactored to extract `renderModalMeta` / `renderModalIngredients` / `renderModalMethod` so serves, air-fryer, and cook-mode toggles can re-render incrementally.
- Service worker `CACHE_VERSION` bumped `v1` → `v2` so existing iPad caches clear and pick up the new shell on next visit.

### Notes
- Schema `method_air_fryer_json` (column AL) is currently empty across all 54 recipes; the toggle is wired and will light up automatically once any recipe ingestion populates the field.
- Basket persists across PWA reopens. Shopping list quantities respect each recipe's per-session serves multiplier captured at add-to-basket time.

---

## [2026-04-07]

### Added
- `tools/process_recipes.py` — complete Phase 1 ingestion pipeline
- `tools/requirements.txt` — pinned dependencies including `google-auth-oauthlib`
- `tools/.env.example` — template with all required environment variables
- `tools/inbox/` and `tools/processed/` — image staging directories
- Google Sheet header row (38 columns A–AL per spec §5.1 + `method_air_fryer_json`)
- HEIC → JPEG conversion via macOS `sips` (1600px / 80% quality)
- OAuth 2.0 Drive upload so files are owned by user account, not service account
- Concrete JSON example in extraction prompt to enforce consistent schema
- Defensive `_d()` helper and flat-field fallbacks for resilient schema parsing
- Post-extraction `infer_fields()` — cuisine and category keyword inference
- `--auto` flag for bulk ingestion without per-recipe approval prompts
- Fuzzy title duplicate detection via `rapidfuzz` (threshold: 85)

### Changed
- Extraction model updated from `claude-3-sonnet-20240229` to `claude-sonnet-4-6`
- `max_tokens` increased from 4000 to 8192 for complex multi-recipe extractions

### Fixed
- `'str' object has no attribute 'get'` — `source` field returned as string by Claude
- `None` fields in preview — `extraction_confidence` / `flagged_for_review` read from top-level, not `meta`
- `storageQuotaExceeded` — Drive auth switched from service account to OAuth
- Images exceeding 5 MB API limit — HEIC compression added
