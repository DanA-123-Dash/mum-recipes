// sw.js — Service Worker for Mum's Recipes PWA
// Caching strategy:
//   App shell (HTML, manifest, fonts) → cache-first
//   data.json → network-first with cache fallback
//   Drive images → cache-first (images don't change once uploaded)

const CACHE_VERSION = 'v2';
const SHELL_CACHE   = `shell-${CACHE_VERSION}`;
const DATA_CACHE    = `data-${CACHE_VERSION}`;
const IMAGE_CACHE   = `images-${CACHE_VERSION}`;

const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Lato:wght@300;400;700&display=swap',
];

// ── Install: pre-cache app shell ────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: clean up old caches ───────────────────────────────────────────
self.addEventListener('activate', event => {
  const keep = [SHELL_CACHE, DATA_CACHE, IMAGE_CACHE];
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => !keep.includes(k)).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: route by request type ────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // data.json → network-first
  if (url.pathname.endsWith('data.json')) {
    event.respondWith(networkFirst(event.request, DATA_CACHE));
    return;
  }

  // Google Drive images → cache-first
  if (url.hostname === 'drive.google.com' || url.hostname === 'lh3.googleusercontent.com') {
    event.respondWith(cacheFirst(event.request, IMAGE_CACHE));
    return;
  }

  // Google Fonts → cache-first
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(event.request, SHELL_CACHE));
    return;
  }

  // App shell → cache-first
  if (event.request.mode === 'navigate' || url.pathname.match(/\.(html|js|json|png|svg|ico)$/)) {
    event.respondWith(cacheFirst(event.request, SHELL_CACHE));
    return;
  }
});

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}
