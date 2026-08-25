/** Registers the PWA service worker. Safe no-op where unsupported. */
export function registerServiceWorker() {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch(() => {
        /* registration failures must never break the app */
      });
  });
}
