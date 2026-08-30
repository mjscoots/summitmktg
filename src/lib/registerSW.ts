/**
 * Summit is installable, not offline. No worker caches anything.
 *
 * This module only cleans up: where it is safe to do so it hands the browser
 * the replacement worker at /sw.js, which clears Summit's old caches and
 * unregisters itself. In dev, in the Lovable preview, inside an iframe, or
 * with ?sw=off, it registers nothing and unregisters whatever is there.
 */

const SW_PATH = '/sw.js';

function isPreviewHost(): boolean {
  const host = window.location.hostname;
  return (
    host.startsWith('id-preview--') ||
    host.startsWith('preview--') ||
    host === 'lovableproject.com' ||
    host.endsWith('.lovableproject.com') ||
    host === 'lovableproject-dev.com' ||
    host.endsWith('.lovableproject-dev.com') ||
    host === 'beta.lovable.dev' ||
    host.endsWith('.beta.lovable.dev') ||
    host === 'localhost' ||
    host === '127.0.0.1'
  );
}

function shouldRegister(): boolean {
  if (!import.meta.env.PROD) return false;
  if (window.self !== window.top) return false;
  if (new URLSearchParams(window.location.search).get('sw') === 'off') return false;
  return !isPreviewHost();
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

export function registerServiceWorker() {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  if (!shouldRegister()) {
    void unregisterAll();
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker.register(SW_PATH, { scope: '/' }).catch(() => {
      /* registration failures must never break the app */
    });
  });
}
