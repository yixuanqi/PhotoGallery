// Ashen Bell Vow v45.7 — Zero-Dependency Offline-First PWA Service Worker
const CACHE_NAME = 'ashen-bell-vow-v45.7';
const CORE_PRECACHE = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './icon.svg',
  './icon-192.png',
  './data/world.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_PRECACHE).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('editor.html') || url.pathname.endsWith('editor.js')) return;

  // Stale-While-Revalidate for all same-origin game scripts, CSS & room JSONs -> instant offline launch + fresh updates!
  event.respondWith(
    caches.open(CACHE_NAME).then(cache =>
      cache.match(req, { ignoreSearch: false }).then(cached => {
        const netFetch = fetch(req).then(resp => {
          if (resp && resp.ok && resp.status === 200) {
            cache.put(req, resp.clone()).catch(() => {});
          }
          return resp;
        }).catch(() => cached);
        return cached || netFetch;
      })
    )
  );
});
