/** Registers the PWA service worker. Safe no-op where unsupported. */

export const SW_UPDATE_EVENT = 'summit:sw-update';

let waitingWorker: ServiceWorker | null = null;

/** Activates the waiting worker and reloads once it takes control. */
export function applyServiceWorkerUpdate() {
  if (!waitingWorker) {
    window.location.reload();
    return;
  }
  waitingWorker.postMessage({ type: 'SKIP_WAITING' });
}

export function registerServiceWorker() {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        const announce = (worker: ServiceWorker | null) => {
          if (!worker) return;
          // Only prompt when an older worker is already in control; a first
          // install must never interrupt someone signing in.
          if (!navigator.serviceWorker.controller) return;
          waitingWorker = worker;
          window.dispatchEvent(new CustomEvent(SW_UPDATE_EVENT));
        };

        announce(registration.waiting);

        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed') announce(installing);
          });
        });

        // Check for a fresh build when the app comes back to the foreground.
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            registration.update().catch(() => undefined);
          }
        });
      })
      .catch(() => {
        /* registration failures must never break the app */
      });
  });
}
