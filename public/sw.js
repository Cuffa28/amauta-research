// Kill-switch: reemplaza al service worker viejo del sitio estático.
// El SW anterior (cache-first) podría servir la versión vieja cacheada a los
// usuarios que ya visitaron el sitio. Al chequear actualizaciones, el navegador
// baja ESTE sw.js, que se autodesregistra, borra todos los caches y recarga.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
        await self.registration.unregister();
        const clients = await self.clients.matchAll({ type: "window" });
        for (const client of clients) {
          try {
            client.navigate(client.url);
          } catch {
            /* noop */
          }
        }
      } catch {
        /* noop */
      }
    })()
  );
});
