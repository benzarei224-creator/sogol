/* سرویس‌ورکر سوگل: کار آفلاین. با هر به‌روزرسانی، VERSION را عوض کنید. */
const VERSION = 'sogol-v1.0.0';
const FILES = [
  './', 'index.html', 'manifest.webmanifest', 'app.css',
  'jalali.js', 'holidays.js', 'data.js', 'icons.js', 'app.js',
  'vazirmatn.woff2', 'parisienne.woff2',
  'flowers.webp', 'cupbooks.webp', 'photo.webp', 'branch.webp',
  'vase1.webp', 'vase2.webp', 'vase3.webp', 'sprig.webp', 'sprig2.webp', 'sprigbl.webp',
  'q1.webp', 'q2.webp', 'q3.webp', 'q4.webp',
  'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => {
      const net = fetch(e.request).then((res) => {
        if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
