/**
 * Service worker du plan Ocellis : ouvertures suivantes plus rapides (et possibles sans réseau).
 *
 * - La page (navigation) est toujours demandée au réseau d'abord, pour voir chaque mise à jour ;
 *   la copie en cache ne sert que hors connexion.
 * - Code, styles, polices, images et données de la maquette ont un nom qui change à chaque
 *   version (empreinte, `?v=`) : ils sont servis depuis le cache dès qu'ils y sont.
 * - Chaque mise en ligne enregistre ce fichier avec un nouveau `?v=` : le cache précédent est effacé.
 */
const VERSION = new URL(self.location.href).searchParams.get('v') || '0';
const CACHE = `ocellis-${VERSION}`;
const DURABLE = /\/assets\/|\/maquette\/scene\.json\?v=|\/plan\/|favicon\.png$/;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((c) => c.startsWith('ocellis-') && c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((r) => {
          if (r.ok) {
            const copie = r.clone();
            caches.open(CACHE).then((c) => c.put(req, copie));
          }
          return r;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || Response.error())),
    );
    return;
  }

  if (DURABLE.test(url.pathname + url.search)) {
    e.respondWith(
      caches.open(CACHE).then(async (c) => {
        const deja = await c.match(req);
        if (deja) return deja;
        const r = await fetch(req);
        if (r.ok) c.put(req, r.clone());
        return r;
      }),
    );
  }
});
