const CACHE_NAME = 'rcc-app-v4';
const STATIC_ASSETS = ['/', '/index.html'];

// ── DEV MODE BYPASS ───────────────────────────────────────────────────────────
// On localhost, skip ALL caching so file changes appear immediately.
// This prevents the white screen / stale bundle issues during development.
const IS_DEV = self.location.hostname === 'localhost' ||
               self.location.hostname === '127.0.0.1' ||
               self.location.hostname.startsWith('192.168.');

// ── INSTALL ───────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  if (IS_DEV) {
    // In dev: unregister the SW entirely so it can't intercept fetches or
    // serve stale cache. This eliminates the PWA cache as a variable when
    // debugging resume/auth behaviour. The SW will be re-registered when
    // you deploy to production (non-localhost hostname).
    event.waitUntil(
      self.registration.unregister().then(() => {
        // Tell all open tabs to reload so they pick up the unregistration.
        return self.clients.matchAll({ type: 'window' }).then(clients => {
          clients.forEach(client => client.navigate(client.url));
        });
      })
    );
    self.skipWaiting();
    return;
  }
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ── ACTIVATE ─────────────────────────────────────────────────────────────────
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

// ── FETCH ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = request.url;

  // Always skip non-GET and API requests
  if (
    request.method !== 'GET' ||
    url.includes('supabase.co') ||
    url.includes('anthropic.com') ||
    url.includes('cloudinary.com')
  ) {
    return;
  }

  // In dev — never cache, always go to network
  if (IS_DEV) {
    event.respondWith(fetch(request));
    return;
  }

  // JS and CSS bundles — NETWORK FIRST
  // If network fails (offline), fall back to cache.
  // This means updated code always loads when online.
  if (
    url.includes('/assets/') ||
    url.endsWith('.js') ||
    url.endsWith('.jsx') ||
    url.endsWith('.css')
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Fonts and images — CACHE FIRST (these never change)
  if (
    url.endsWith('.woff2') ||
    url.endsWith('.woff') ||
    url.endsWith('.ttf') ||
    url.endsWith('.png') ||
    url.endsWith('.jpg') ||
    url.endsWith('.svg') ||
    url.endsWith('.ico') ||
    url.endsWith('.webp')
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) => cached || fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
      )
    );
    return;
  }

  // Everything else (HTML, manifests) — NETWORK FIRST
  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      })
      .catch(() => caches.match(request))
  );
});
