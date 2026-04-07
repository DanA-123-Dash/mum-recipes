# Changelog — Mum's Recipe Book

All notable changes will be documented here.

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
