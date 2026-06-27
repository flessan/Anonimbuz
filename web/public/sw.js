// ============================================
// Anonimbuz Service Worker v1.0
// Strategy: Network-First with Cache Fallback
// ============================================

const CACHE_NAME = 'anonimbuz-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
];

// ── Install: Cache static shell ──────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).catch((err) => {
      console.warn('[SW] Install cache failed (non-fatal):', err);
    })
  );
  self.skipWaiting();
});

// ── Activate: Clean old caches ───────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// ── Fetch: Network-first, fallback to cache ──
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip API calls and non-GET requests
  if (
    event.request.method !== 'GET' ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/functions/')
  ) {
    return;
  }

  // For navigation requests (HTML pages): network first, then offline page
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          // Cache a fresh copy of the page
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return res;
        })
        .catch(() => {
          return caches.match('/') || new Response(
            `<!DOCTYPE html>
            <html lang="id">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Anonimbuz - Offline</title>
              <style>
                body { font-family: 'Inter', sans-serif; background: #09090b; color: #f4f4f5;
                  display: flex; align-items: center; justify-content: center; min-height: 100vh;
                  text-align: center; flex-direction: column; gap: 16px; margin: 0; }
                h1 { font-size: 2rem; font-weight: 800; }
                p { color: #a1a1aa; }
                button { padding: 12px 24px; background: #818cf8; color: white; border: none;
                  border-radius: 8px; font-size: 16px; cursor: pointer; }
              </style>
            </head>
            <body>
              <div>📡</div>
              <h1>Kamu Offline</h1>
              <p>Periksa koneksi internetmu dan coba lagi.</p>
              <button onclick="location.reload()">Coba Lagi</button>
            </body>
            </html>`,
            { headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }

  // For static assets (JS/CSS/fonts): cache first
  if (
    url.pathname.match(/\.(js|css|woff2?|ttf|svg|png|ico|jpg|jpeg|webp)$/)
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return res;
        });
      })
    );
  }
});

// ── Push notifications (future use) ──────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'Anonimbuz', {
      body: data.body || '',
      icon: '/favicon-32x32.png',
      badge: '/favicon-16x16.png',
      data: data.url ? { url: data.url } : {},
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.notification.data?.url) {
    event.waitUntil(clients.openWindow(event.notification.data.url));
  }
});
