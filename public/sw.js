// Service worker mínimo: permite instalar la app y abrirla sin conexión.
// - Páginas: primero la red (así siempre se ve la última versión) y, si no hay conexión, la copia guardada.
// - Archivos del juego (llevan un código en el nombre, nunca cambian): primero la copia guardada.
// - /api/ (buzón, ranking) nunca se guarda.
const CACHE = "vectorcitos-" + (new URL(self.location).searchParams.get("v") || "dev");

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["/", "/favicon.svg", "/manifest.webmanifest"])));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/")) return;

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put("/", copy)); return res; }).catch(() => caches.match("/")),
    );
    return;
  }
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    })),
  );
});

// Avisos del reto diario (los envía /api/remind una vez al día).
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { /* sin datos */ }
  e.waitUntil(self.registration.showNotification(d.title || "Vectorcitos Run", {
    body: d.body || "", icon: "/icon-192.png", badge: "/icon-192.png", tag: "daily", renotify: false, data: { url: d.url || "/" },
  }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
    const c = cs[0];
    return c ? c.focus() : self.clients.openWindow(url);
  }));
});
