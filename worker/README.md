# mum-recipes-api

Cloudflare Worker backing the shared cook log for the [mum-recipes](../README.md) PWA. Free-tier eligible at expected household scale (~50 reads + 5 writes/day).

## What it does

Three endpoints under `/log`:

| Method | Path | Body / params | Returns |
|---|---|---|---|
| `GET`    | `/log?recipeId=<id>` | — | `200` array of entries (newest first) |
| `POST`   | `/log`               | `{recipeId, profile, rating, note, cookedDate, clientId}` | `201` row; `200` if `clientId` already exists |
| `DELETE` | `/log/:clientId`     | — | `204` |

- Auth: `Authorization: Bearer $FAMILY_TOKEN`
- CORS: only `ALLOWED_ORIGINS` get the `Access-Control-Allow-Origin` header
- Rate limit: 60 requests/min/IP via a KV counter

## First-time setup

You'll do this once per Cloudflare account. Total time: ~10 minutes.

### 1. Install wrangler

```bash
cd worker
npm install
npx wrangler login   # browser-based OAuth, free, no card needed
```

### 2. Create the D1 database

```bash
npx wrangler d1 create mum_recipes_cook_log
```

Copy the `database_id` it prints, paste it into `wrangler.toml` replacing `REPLACE_AFTER_wrangler_d1_create`.

### 3. Create the KV namespace (rate limiter)

```bash
npx wrangler kv namespace create RATE_LIMITER
```

Copy the `id` and paste into `wrangler.toml` replacing `REPLACE_AFTER_wrangler_kv_namespace_create`.

### 4. Run the migration

```bash
# Apply schema to the remote D1 instance
npm run migrate:remote
```

### 5. Set the family token

Generate a random 32+ char token (e.g. `openssl rand -hex 24`) and set it:

```bash
npx wrangler secret put FAMILY_TOKEN
# paste the token when prompted
```

Save the same token into `index.html` as `FAMILY_TOKEN` (a constant near the top of the `<script>` block). It's visible to anyone viewing source — that's fine, it's not real auth, just enough to keep crawlers out.

### 6. Deploy

```bash
npm run deploy
```

You'll get a URL like `https://mum-recipes-api.<your-handle>.workers.dev`. Paste it into `index.html` as `WORKER_URL`.

### 7. Smoke test

```bash
TOK=<your-token>
URL=https://mum-recipes-api.<your-handle>.workers.dev

# Empty list
curl -H "Authorization: Bearer $TOK" "$URL/log?recipeId=test"

# Create one
curl -X POST "$URL/log" \
  -H "Authorization: Bearer $TOK" \
  -H "Content-Type: application/json" \
  -d '{"recipeId":"test","profile":"dan","rating":5,"note":"smoke test","cookedDate":"2026-05-31","clientId":"smoke-test-1"}'

# List it
curl -H "Authorization: Bearer $TOK" "$URL/log?recipeId=test"

# Delete it
curl -X DELETE -H "Authorization: Bearer $TOK" "$URL/log/smoke-test-1"
```

## Local dev

```bash
npm run dev
# Worker on http://localhost:8787 with a local D1 SQLite file
# Set FAMILY_TOKEN locally via .dev.vars:
#   FAMILY_TOKEN=local-dev-token
```

`.dev.vars` is gitignored.

## Cost monitoring

- `npx wrangler d1 info mum_recipes_cook_log` — reads/writes/storage usage
- Dashboard: https://dash.cloudflare.com → Workers & Pages → mum-recipes-api → Metrics
- Free tier: 100k Worker requests/day, 5M D1 row reads/day, 100k D1 row writes/day, 5GB D1 storage. Expected household usage will be ~0.1% of these.

## Rotating the token

```bash
npx wrangler secret put FAMILY_TOKEN   # set new value
# Update FAMILY_TOKEN constant in ../index.html, commit, push.
# Old PWA installs lose access until the new index.html is fetched.
```
