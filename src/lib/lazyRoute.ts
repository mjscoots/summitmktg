import { lazy, type ComponentType } from 'react';

/**
 * Pass 111 - a route chunk that no longer exists on the server (a client sitting
 * on an old build, or a service worker holding dead asset hashes) used to reject
 * the dynamic import and surface a generic failure. Instead: clear the caches,
 * drop the worker, and reload once with a cache-busting parameter. A second
 * failure is a real error and is allowed through to the error boundary.
 */

const RETRY_KEY = 'summit.chunk-retry';

export function isChunkLoadError(error: unknown): boolean {
  const message = String((error as { message?: string })?.message || error || '');
  return (
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /ChunkLoadError/i.test(message)
  );
}

function alreadyRetried(): boolean {
  try {
    return sessionStorage.getItem(RETRY_KEY) === '1';
  } catch {
    return false;
  }
}

function markRetried() {
  try {
    sessionStorage.setItem(RETRY_KEY, '1');
  } catch {
    /* storage unavailable */
  }
}

/** Clears every cached asset and the worker, then reloads with a fresh query. */
export async function recoverFromStaleBuild(): Promise<void> {
  markRetried();
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    /* cache API unavailable */
  }
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {
    /* worker API unavailable */
  }
  const url = new URL(window.location.href);
  url.searchParams.set('build', String(Date.now()));
  window.location.replace(url.toString());
}

/** Clears the retry latch once the app has rendered on a healthy build. */
export function clearChunkRetryLatch() {
  try {
    sessionStorage.removeItem(RETRY_KEY);
  } catch {
    /* storage unavailable */
  }
}

export function lazyRoute<T extends ComponentType<unknown>>(load: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      return await load();
    } catch (error) {
      if (isChunkLoadError(error) && !alreadyRetried()) {
        await recoverFromStaleBuild();
        // The reload takes over; keep the promise pending so nothing flashes.
        return await new Promise<{ default: T }>(() => undefined);
      }
      throw error;
    }
  });
}
