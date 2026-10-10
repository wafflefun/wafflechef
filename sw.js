/* Waffle Chef - modo sin internet
   CAMBIAR: cuando actualices el juego, sube el número de VERSION (v1 -> v2) para que el celular baje lo nuevo.
   AGREGAR: si sumas imágenes o audios nuevos, ponlos en la lista ARCHIVOS. */
const VERSION = 'v1';
const CACHE = 'waffle-chef-' + VERSION;
const ARCHIVOS = [
  './', './index.html', './manifest.json',
  './icon-192.png', './icon-512.png',
  './menu-bg.jpg', './title-awning.webp', './title-logo.webp', './title-mascot.webp',
  './sunday-morning-kitchen.mp3', './too-many-toppings.mp3'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('waffle-chef-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* El audio pide pedazos (Range): los armamos desde el caché */
async function rango(req, res) {
  const buf = await res.arrayBuffer();
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range'));
  const ini = m[1] ? parseInt(m[1], 10) : 0;
  const fin = m[2] ? Math.min(parseInt(m[2], 10), buf.byteLength - 1) : buf.byteLength - 1;
  return new Response(buf.slice(ini, fin + 1), {
    status: 206,
    headers: {
      'Content-Type': res.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Range': 'bytes ' + ini + '-' + fin + '/' + buf.byteLength,
      'Content-Length': fin - ini + 1
    }
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  /* Menú del portal (juegos.js): no se guarda, solo funciona con internet */
  if (url.hostname === 'wafflefun.github.io' && url.pathname.endsWith('/juegos.js')) return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    let res = await cache.match(req, { ignoreSearch: true });
    if (!res) {
      try {
        res = await fetch(req);
        /* Guarda también las fuentes de Google la primera vez que hay internet */
        if (res && (res.ok || res.type === 'opaque') && (url.origin === location.origin || url.hostname.includes('fonts.g'))) {
          cache.put(req, res.clone());
        }
      } catch (err) {
        if (req.mode === 'navigate') return cache.match('./index.html');
        return Response.error();
      }
    }
    if (req.headers.has('range') && res.status === 200) return rango(req, res);
    return res;
  })());
});
