// Deliberately never caches authenticated pages, API responses, or mutations.
const CACHE = "ketansum-offline-v1";
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.add("/admin-offline.html")),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key.startsWith("ketansum-offline-") && key !== CACHE,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    url.origin !== self.location.origin ||
    event.request.method !== "GET" ||
    event.request.mode !== "navigate" ||
    !(
      url.pathname === "/login" ||
      url.pathname === "/admin" ||
      url.pathname.startsWith("/admin/")
    )
  )
    return;
  event.respondWith(
    fetch(event.request).catch(
      async () =>
        (await caches.match("/admin-offline.html")) || Response.error(),
    ),
  );
});
