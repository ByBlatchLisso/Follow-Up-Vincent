// Service worker Suivi Vincent — cache le shell de l'app pour l'ouverture hors-ligne.
// Navigation : réseau d'abord (dernière version en ligne), repli sur le cache hors-ligne.
// Requêtes Supabase et cross-origin : jamais interceptées (laissées au réseau).
const CACHE = 'suivi-vincent-v3';
const SHELL = ['./', './index.html', './manifest.json'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;                     // POST/PATCH Supabase -> réseau direct
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;      // Supabase & cross-origin -> non interceptés
  if (req.mode === 'navigate') {                        // page : réseau d'abord, cache en secours
    e.respondWith(
      fetch(req)
        .then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); return r; })
        .catch(() => caches.match(req).then((m) => m || caches.match('./index.html')))
    );
    return;
  }
  e.respondWith(                                          // autres GET same-origin : cache d'abord
    caches.match(req).then((m) => m || fetch(req).then((r) => {
      const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); return r;
    }).catch(() => m))
  );
});
