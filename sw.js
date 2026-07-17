const CACHE = 'pp5-v4';
const OFFLINE = ['/'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(OFFLINE)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  // Delete all old caches so stale HTML is never served
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Network-first: fresh content when online; cache each successful same-origin
  // response so pages actually work offline (API calls to Supabase are not cached)
  const url = new URL(e.request.url);
  const cacheable = url.origin === self.location.origin;
  e.respondWith(
    fetch(e.request).then(res => {
      if (cacheable && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match(e.request))
  );
});
