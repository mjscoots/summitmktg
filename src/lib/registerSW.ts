/**
 * Summit is installable, not offline. No worker caches anything, and no worker
 * is registered anywhere.
 *
 * This module only cleans up after the old caching worker: it unregisters any
 * worker still installed at /sw.js and deletes the caches that worker created.
 * The cleanup runs from the page, so nothing can reload the tab.
 */

const SW_PATH = '/sw.js';

function isSummitAppShellCache(name: string): boolean {
  return /^summit-(static|shell)-/.test(name);
}

async function unregisterAll() {
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(
      registrations
        .filter((r) => (r.active || r.installing || r.waiting)?.scriptURL.endsWith(SW_PATH))
        .map((r) => r.unregister())
    );
  } catch {
    /* cleanup must never break the app */
  }
}

async function clearOldCaches() {
  try {
    if (!('caches' in window)) return;
    const names = await caches.keys();
    await Promise.allSettled(names.filter(isSummitAppShellCache).map((n) => caches.delete(n)));
  } catch {
    /* cleanup must never break the app */
  }
}

export function registerServiceWorker() {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  void unregisterAll();
  void clearOldCaches();
}
