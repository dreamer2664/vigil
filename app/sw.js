/* Vigil service worker — offline shell + last-good state.
   Policy (CONTRACT.md §4):
   - shell (html/css/js/icons): network-first, last-good cache fallback
   - state.json: network-first (freshness is the product), fall back to cache
   - everything else: network, no caching of third parties (there are none) */
const VERSION = "vigil-v5"; // corrected primary-archive link; network-first shell policy retained
const SHELL = [
  "../", "../index.html", "./app.css", "./app.js",
  "./views/now.js", "./views/chat.js", "./views/crew.js",
  "./views/records.js", "./views/projects.js",
  "./manifest.webmanifest", "../icons/icon-192.png", "../icons/icon-512.png",
];
const STATE_RE = /state\.(json|sample\.json)$/;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.origin === location.origin && STATE_RE.test(url.pathname)) {
    e.respondWith(
      fetch(e.request, { cache: "no-store" })
        .then((r) => {
          const copy = r.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copy));
          return r;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }
  if (url.origin === location.origin) {
    /* network-first, cache fallback: the fix must land on the next load; the
       cache exists for offline, not for keeping yesterday's bug alive */
    e.respondWith(
      fetch(e.request)
        .then((r) => {
          if (r && r.ok) {
            const copy = r.clone();
            caches.open(VERSION).then((c) => c.put(e.request, copy));
          }
          return r;
        })
        .catch(() => caches.match(e.request).then((hit) => hit || Response.error()))
    );
  }
  /* ntfy and raw.githubusercontent.com pass straight through (no caching:
     staleness there would defeat the freshness banner) */
});
