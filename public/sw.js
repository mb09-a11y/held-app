const CACHE_NAME = 'rcc-app-v2';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Network first, fall back to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET and Supabase/API requests — always go to network for those
  if (
    event.request.method !== 'GET' ||
    event.request.url.includes('supabase.co') ||
    event.request.url.includes('anthropic.com') ||
    event.request.url.includes('cloudinary.com')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      });
    })
  );
});
