/* Vigil service worker — offline shell + last-good state.
   Policy (CONTRACT.md §4):
   - shell (html/css/js/icons): network-first, last-good cache fallback
   - state.json: network-first (freshness is the product), fall back to cache
   - everything else: network, no caching of third parties (there are none) */
const VERSION = "vigil-v6"; // v6: best-effort install (one failed asset must not kill the SW);
                            //     awaited cache writes; wires retry moved into the app
const SHELL = [
  "../", "../index.html", "./app.css", "./app.js",
  "./views/now.js", "./views/chat.js", "./views/crew.js",
  "./views/records.js", "./views/projects.js",
  "./manifest.webmanifest", "../icons/icon-192.png", "../icons/icon-512.png",
];
const STATE_RE = /state\.(json|sample\.json)$/;

self.addEventListener("install", (e) => {
  /* addAll is all-or-nothing: one 404 (or one flaky icon on a bad connection)
     used to abort the install and leave the phone with NO service worker at
     all. Best-effort instead: cache what answers, log what does not — the
     network-first fetch handler fills any hole on the next online load. */
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => Promise.allSettled(SHELL.map((u) => c.add(u))))
      .then((rs) => {
        const missed = rs.filter((r) => r.status === "rejected").length;
        if (missed) console.warn(`[sw ${VERSION}] install: ${missed}/${SHELL.length} shell assets did not cache (will retry online)`);
      })
      .then(() => self.skipWaiting())
  );
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
    e.respondWith((async () => {
      try {
        const r = await fetch(e.request, { cache: "no-store" });
        if (r && r.ok) {
          const copy = r.clone();
          const c = await caches.open(VERSION);
          await c.put(e.request, copy);      // awaited: a failed write must not vanish silently
        }
        return r;
      } catch {
        return (await caches.match(e.request)) || Response.error();
      }
    })());
    return;
  }
  if (url.origin === location.origin) {
    /* network-first, cache fallback: the fix must land on the next load; the
       cache exists for offline, not for keeping yesterday's bug alive */
    e.respondWith((async () => {
      try {
        const r = await fetch(e.request);
        if (r && r.ok) {
          const copy = r.clone();
          const c = await caches.open(VERSION);
          await c.put(e.request, copy);
        }
        return r;
      } catch {
        return (await caches.match(e.request)) || Response.error();
      }
    })());
  }
  /* ntfy and raw.githubusercontent.com pass straight through (no caching:
     staleness there would defeat the freshness banner) */
});
