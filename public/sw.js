/* Summit service worker — conservative caching.
   - Navigations / HTML: network-first (never serve a stale app shell after a deploy)
   - Static build assets: cache-first
   - Everything else (API, auth, uploads): untouched, straight to network */

const VERSION = 'v2-2026-08-25';
const STATIC_CACHE = `summit-static-${VERSION}`;
const SHELL_CACHE = `summit-shell-${VERSION}`;
const KEEP = [STATIC_CACHE, SHELL_CACHE];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(SHELL_CACHE).then((c) => c.addAll(['/']).catch(() => undefined))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const isStaticAsset = (url) =>
  url.origin === self.location.origin &&
  (url.pathname.startsWith('/assets/') ||
    /\.(?:css|js|png|jpg|jpeg|svg|webp|woff2?|ico)$/.test(url.pathname));

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Never touch backend traffic.
  if (url.origin !== self.location.origin) return;

  // Navigation requests: network-first with a cached shell fallback when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put('/', copy)).catch(() => undefined);
          return res;
        })
        .catch(() => caches.match('/').then((r) => r || Response.error()))
    );
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(req, copy)).catch(() => undefined);
            }
            return res;
          })
      )
    );
  }
});

// Allow the page to activate a waiting worker immediately (reload prompt).
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
