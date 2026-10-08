/**
 * GH Pay - Service Worker Lifecycle
 * Safely self-unregisters in development/preview to prevent stale module caching.
 */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((k) => caches.delete(k)));
    }).then(() => {
      return self.registration.unregister();
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Pass through all fetch requests directly to network without caching
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
