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
    event.request.url.includes('cloudinary.com') ||
    event.request.url.includes('resend.com')
  ) {
    return;
  }

  // Network-first for JS, CSS, JSX bundles — never serve stale code
  const url = new URL(event.request.url);
  const isAsset = url.pathname.includes('/assets/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.jsx') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.mjs');

  if (isAsset) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache fresh copy
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request)) // fallback to cache only if offline
    );
    return;
  }

  // Cache-first for images, fonts, and other static assets
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      });
    })
  );
});
