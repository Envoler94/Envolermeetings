/* Envoler Follow-ups service worker: lets the app open without signal. */
const VERSION = "envoler-v6";
const SHELL = ["./", "./index.html", "./config.js", "./manifest.webmanifest", "./whisper-worker.js",
  "./icons/app-192.png", "./icons/app-512.png", "./icons/app-touch-180.png", "./icons/app-favicon.png", "./icons/envoler-logo.jpg"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return; // never touch Google or API calls
  // Network first so updates on GitHub reach phones; fall back to cache when offline.
  e.respondWith(
    fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(VERSION).then(c => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match("./index.html")))
  );
});
