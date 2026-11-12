/* Service Worker: macht die App offline nutzbar. Bei Updates CACHE-Version erhöhen. */
const CACHE = 'progress-v9';
const APP = [
  './', 'index.html', 'styles.css', 'manifest.webmanifest',
  'store.js', 'ui.js', 'bodymap.js', 'scanner.js', 'nutrition.js', 'training.js', 'weight.js', 'stats.js', 'csvimport.js', 'streak.js', 'main.js',
  'apple-touch-icon.png', 'icon-192.png', 'icon-512.png',
];
const LIB = 'https://cdn.jsdelivr.net/npm/zxing-wasm@3.0.2/dist/iife/reader/index.js';

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
  // Scanner-Engine (Skript + WebAssembly): einmal laden, dann aus dem Speicher
  if (req.url === LIB || url.hostname.endsWith('jsdelivr.net')) {
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
