/* Service worker de MatsuPega (PWA).
   Solo guarda en caché los archivos propios de la página ("app shell").
   Nunca toca Firebase, Google APIs ni Drive: esas peticiones van directo a internet.

   IMPORTANTE: cuando cambies archivos de la página, sube el número de VERSION
   para que los teléfonos descarguen la versión nueva. */
const VERSION = 'v3';
const CACHE = 'matsupega-shell-' + VERSION;

const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/styles.css',
  'js/firebase.js',
  'js/utils.js',
  'js/datos.js',
  'js/auth.js',
  'js/drive.js',
  'js/galeria.js',
  'js/solicitudes.js',
  'js/productos.js',
  'js/usuarios.js',
  'js/reporte.js',
  'js/avisos.js',
  'js/app.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  // Borra cachés de versiones anteriores
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('matsupega-shell-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Solo archivos de nuestro propio sitio. Firebase, googleapis, gstatic,
  // drive.google.com, fuentes, etc. pasan sin intervención.
  if (url.origin !== self.location.origin) return;

  const esPagina = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  if (esPagina) {
    event.respondWith(redPrimero(req));
  } else {
    event.respondWith(cacheMientrasActualiza(req, event));
  }
});

// HTML: intenta internet primero; si no hay conexión, usa la copia guardada.
async function redPrimero(req) {
  const cache = await caches.open(CACHE);
  try {
    const resp = await fetch(req);
    if (resp.ok) cache.put(req, resp.clone());
    return resp;
  } catch (err) {
    return (await cache.match(req)) || (await cache.match('index.html')) || Response.error();
  }
}

// CSS/JS/íconos: responde rápido con la copia guardada y la renueva en segundo plano.
async function cacheMientrasActualiza(req, event) {
  const cache = await caches.open(CACHE);
  const guardada = await cache.match(req);
  const deRed = fetch(req)
    .then(resp => { if (resp.ok) cache.put(req, resp.clone()); return resp; })
    .catch(() => null);
  if (guardada) {
    event.waitUntil(deRed);
    return guardada;
  }
  return (await deRed) || Response.error();
}

// Al tocar una notificación: abre la app (o la trae al frente si ya está abierta)
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(lista => {
      const abierta = lista.find(c => c.url.startsWith(self.registration.scope));
      if (abierta) return abierta.focus();
      return self.clients.openWindow('./');
    })
  );
});
