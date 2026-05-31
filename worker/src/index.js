// mum-recipes-api — shared cook log Worker.
//
// Three endpoints, all under /log:
//   GET    /log?recipeId=<id>     → list entries for one recipe (newest first)
//   POST   /log                    → create an entry (idempotent on client_id)
//   DELETE /log/:clientId          → delete an entry
//
// Auth: shared bearer token from `wrangler secret put FAMILY_TOKEN`.
// CORS: only origins in env.ALLOWED_ORIGINS are echoed back.
// Rate limit: 60 requests/min/IP via KV counter (RATE_LIMITER).

const RATE_LIMIT_PER_MIN = 60;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const corsHeaders = buildCorsHeaders(origin, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (!authOk(request, env)) {
      return json({ error: 'unauthorised' }, 401, corsHeaders);
    }

    const ipOk = await rateLimitOk(request, env);
    if (!ipOk) {
      return json({ error: 'rate_limited' }, 429, corsHeaders);
    }

    try {
      if (url.pathname === '/log' && request.method === 'GET') {
        return await handleList(url, env, corsHeaders);
      }
      if (url.pathname === '/log' && request.method === 'POST') {
        return await handleCreate(request, env, corsHeaders);
      }
      const delMatch = url.pathname.match(/^\/log\/([A-Za-z0-9._-]+)$/);
      if (delMatch && request.method === 'DELETE') {
        return await handleDelete(delMatch[1], env, corsHeaders);
      }
      return json({ error: 'not_found' }, 404, corsHeaders);
    } catch (err) {
      return json({ error: 'internal', detail: String(err && err.message || err) }, 500, corsHeaders);
    }
  },
};

// ── Handlers ───────────────────────────────────────────────────────────────

async function handleList(url, env, cors) {
  const recipeId = url.searchParams.get('recipeId');
  if (!recipeId) return json({ error: 'recipeId_required' }, 400, cors);

  const stmt = env.COOK_LOG_DB.prepare(
    'SELECT id, recipe_id, profile, rating, note, cooked_date, client_id, created_at ' +
    'FROM cook_log WHERE recipe_id = ?1 ORDER BY created_at DESC LIMIT 200'
  ).bind(recipeId);
  const { results } = await stmt.all();
  return json(results || [], 200, cors);
}

async function handleCreate(request, env, cors) {
  let body;
  try { body = await request.json(); }
  catch (_) { return json({ error: 'invalid_json' }, 400, cors); }

  const v = validateCreate(body);
  if (v.error) return json(v, 400, cors);

  // Idempotent: if client_id already exists, return the existing row.
  const existing = await env.COOK_LOG_DB.prepare(
    'SELECT id, recipe_id, profile, rating, note, cooked_date, client_id, created_at ' +
    'FROM cook_log WHERE client_id = ?1'
  ).bind(body.clientId).first();
  if (existing) return json(existing, 200, cors);

  await env.COOK_LOG_DB.prepare(
    'INSERT INTO cook_log (recipe_id, profile, rating, note, cooked_date, client_id) ' +
    'VALUES (?1, ?2, ?3, ?4, ?5, ?6)'
  ).bind(
    body.recipeId,
    body.profile,
    body.rating,
    body.note || null,
    body.cookedDate,
    body.clientId
  ).run();

  const created = await env.COOK_LOG_DB.prepare(
    'SELECT id, recipe_id, profile, rating, note, cooked_date, client_id, created_at ' +
    'FROM cook_log WHERE client_id = ?1'
  ).bind(body.clientId).first();
  return json(created, 201, cors);
}

async function handleDelete(clientId, env, cors) {
  await env.COOK_LOG_DB.prepare(
    'DELETE FROM cook_log WHERE client_id = ?1'
  ).bind(clientId).run();
  return new Response(null, { status: 204, headers: cors });
}

// ── Helpers ────────────────────────────────────────────────────────────────

function validateCreate(b) {
  if (!b || typeof b !== 'object') return { error: 'invalid_body' };
  if (typeof b.recipeId !== 'string' || !b.recipeId) return { error: 'recipeId_required' };
  if (typeof b.profile !== 'string' || !b.profile) return { error: 'profile_required' };
  if (!Number.isInteger(b.rating) || b.rating < 1 || b.rating > 5) return { error: 'rating_invalid' };
  if (b.note != null && typeof b.note !== 'string') return { error: 'note_invalid' };
  if (b.note && b.note.length > 2000) return { error: 'note_too_long' };
  if (typeof b.cookedDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(b.cookedDate)) return { error: 'cookedDate_invalid' };
  if (typeof b.clientId !== 'string' || b.clientId.length < 8 || b.clientId.length > 64) return { error: 'clientId_invalid' };
  return {};
}

function authOk(request, env) {
  const expected = env.FAMILY_TOKEN;
  if (!expected) return false; // secret not configured — fail closed
  const header = request.headers.get('Authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;
  // Constant-time-ish comparison
  const supplied = match[1];
  if (supplied.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < supplied.length; i++) diff |= supplied.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

function buildCorsHeaders(origin, env) {
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const ok = origin && allowed.includes(origin);
  return {
    'Access-Control-Allow-Origin': ok ? origin : 'null',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

async function rateLimitOk(request, env) {
  if (!env.RATE_LIMITER) return true; // KV not bound — skip rate limit
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const bucket = Math.floor(Date.now() / 60000); // 1-minute window
  const key = `rl:${ip}:${bucket}`;
  const raw = await env.RATE_LIMITER.get(key);
  const count = raw ? parseInt(raw, 10) : 0;
  if (count >= RATE_LIMIT_PER_MIN) return false;
  await env.RATE_LIMITER.put(key, String(count + 1), { expirationTtl: 120 });
  return true;
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}
