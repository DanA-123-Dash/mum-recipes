# Journal — Mum's Recipe Book

---

## 2026-04-07 — Phase 1 ingestion pipeline

Built and ran the full ingestion pipeline end-to-end. 5 iPhone HEIC photos processed → 6 recipes extracted via Claude Vision and written to Google Sheets + Drive. Resolved service account Drive quota issue by switching to OAuth 2.0. Fixed schema inconsistency by anchoring the extraction prompt with a concrete JSON example. Pipeline supports `--auto` mode for bulk runs. Phase 2 (GitHub repo + PWA) is next.
