/**
 * Summit is installable, not offline. Nothing caches, and no worker is
 * registered for anyone who has not turned push on (see src/lib/push.ts).
 *
 * This module only cleans up after the old caching worker: it deletes the
 * caches that worker created and, when the person has not opted into push,
 * unregisters the worker at /sw.js. A push subscriber keeps their worker.
 * The cleanup runs from the page, so nothing can reload the tab.
 */

import { pushOptedIn } from './push';

const SW_PATH = '/sw.js';

function isSummitAppShellCache(name: string): boolean {
  return /^summit-(static|shell)-/.test(name);
}

async function unregisterIdleWorkers() {
  try {
    if (pushOptedIn()) return;
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
  void unregisterIdleWorkers();
  void clearOldCaches();
}
