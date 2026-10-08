/**
 * Service Worker Registration and Lifecycle Manager
 */

export function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return Promise.resolve(null);
  }

  return navigator.serviceWorker
    .register('/sw.js', { scope: '/' })
    .then((registration) => {
      // Check for updates periodically
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker) {
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // New content available
                window.dispatchEvent(new CustomEvent('gh_pay_sw_update_available'));
              } else {
                // Content cached for offline use
                window.dispatchEvent(new CustomEvent('gh_pay_sw_cached'));
              }
            }
          };
        }
      };

      return registration;
    })
    .catch((error) => {
      console.warn('[ServiceWorker] Registration failed:', error);
      return null;
    });
}

export function requestBackgroundSync(tag = 'sync-bills'): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  navigator.serviceWorker.ready
    .then((reg) => {
      // Background Sync API (Chrome/Edge/Android)
      if ('sync' in reg) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (reg as any).sync.register(tag);
      }
    })
    .catch((err) => {
      console.warn('[ServiceWorker] Background Sync registration error:', err);
    });
}
