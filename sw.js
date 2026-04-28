const CACHE = 'apex-v1';
const ASSETS = [
  '/', '/index.html', '/src/style.css',
  '/src/db.js', '/src/data.js', '/src/utils.js', '/src/app.js',
  '/src/views/home.js', '/src/views/workout.js', '/src/views/run.js',
  '/src/views/nutrition.js', '/src/views/progress.js', '/src/views/body.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(()=>{}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Don't cache Open Food Facts API calls
  if (e.request.url.includes('openfoodfacts')) return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      if (res.ok && e.request.method === 'GET') {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    })).catch(() => caches.match('/index.html'))
  );
});
