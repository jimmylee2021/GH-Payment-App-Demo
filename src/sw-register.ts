/**
 * Service Worker Lifecycle & Offline Cache Manager
 * In development and preview environments, unregisters service workers and clears
 * caches to prevent stale asset interception and white screen issues.
 */

export function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return Promise.resolve(null);
  }

  // In development, preview, or iframe environments, actively unregister
  // service workers and clear caches to prevent Vite module interception
  if (import.meta.env.DEV || window.self !== window.top) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().catch(() => {});
      }
    });

    if ('caches' in window) {
      caches.keys().then((names) => {
        for (const name of names) {
          caches.delete(name).catch(() => {});
        }
      });
    }
    return Promise.resolve(null);
  }

  return navigator.serviceWorker
    .register('/sw.js', { scope: '/' })
    .then((registration) => {
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker) {
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                window.dispatchEvent(new CustomEvent('gh_pay_sw_update_available'));
              } else {
                window.dispatchEvent(new CustomEvent('gh_pay_sw_cached'));
              }
            }
          };
        }
      };
      return registration;
    })
    .catch((error) => {
      console.warn('[ServiceWorker] Registration skipped:', error);
      return null;
    });
}

export function requestBackgroundSync(tag = 'sync-bills'): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  navigator.serviceWorker.ready
    .then((reg) => {
      if ('sync' in reg) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (reg as any).sync.register(tag);
      }
    })
    .catch((err) => {
      console.warn('[ServiceWorker] Background Sync registration error:', err);
    });
}
