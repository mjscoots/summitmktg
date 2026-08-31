/* Summit cleanup worker.

   Summit is an installable app, not an offline app: nothing here caches, and
   nothing here serves responses. This file exists only so browsers that still
   hold the old caching worker at /sw.js receive a replacement that clears the
   caches that worker created and then unregisters itself.

   It never navigates or reloads open tabs. Reloading from a worker that then
   unregisters itself can put a tab into a repeating reload loop, so the page
   is left alone and picks up fresh files on its next normal navigation.

   Only Summit's own caches are removed. Cache Storage is shared across the
   origin, so other workers keep their own buckets. */

function isSummitAppShellCache(name) {
  return /^summit-(static|shell)-/.test(name);
}

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) =>
  event.waitUntil(
    (async () => {
      try {
        const names = await caches.keys();
        await Promise.allSettled(names.filter(isSummitAppShellCache).map((n) => caches.delete(n)));
      } finally {
        // activate fires once, so the unregister has to happen no matter what.
        await self.registration.unregister();
      }
    })()
  )
);
