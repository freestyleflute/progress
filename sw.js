/* Service Worker: macht die App offline nutzbar. Bei Updates CACHE-Version erhöhen. */
const CACHE = 'progress-v1';
const APP = [
  './', 'index.html', 'styles.css', 'manifest.webmanifest',
  'js/store.js', 'js/ui.js', 'js/bodymap.js', 'js/nutrition.js', 'js/training.js', 'js/weight.js', 'js/main.js',
  'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png',
];
const LIB = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(APP)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Produktdatenbank immer live abfragen
  if (url.hostname.endsWith('openfoodfacts.org')) return;
  // Scanner-Bibliothek: einmal laden, dann aus dem Speicher
  if (req.url === LIB) {
    e.respondWith(caches.open(CACHE).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    }));
    return;
  }
  if (url.origin !== location.origin) return;
  // Eigene Dateien: erst Netz (für Updates), sonst Speicher
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
  );
});
