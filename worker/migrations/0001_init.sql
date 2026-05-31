-- 0001_init.sql — cook_log table for shared cross-device cook history.
-- Run with:  wrangler d1 execute mum_recipes_cook_log --file=migrations/0001_init.sql
-- Apply to remote: add --remote.

CREATE TABLE IF NOT EXISTS cook_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id   TEXT    NOT NULL,
  profile     TEXT    NOT NULL,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  note        TEXT,
  cooked_date TEXT    NOT NULL,
  client_id   TEXT    NOT NULL UNIQUE,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cook_log_recipe
  ON cook_log(recipe_id, created_at DESC);
