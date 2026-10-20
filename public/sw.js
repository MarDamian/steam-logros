/*
 * Service worker propio, sin librerías. Tres estrategias según qué se pide:
 *
 * - Navegación: red primero y, si no hay, el index.html cacheado. Es lo que
 *   hace que la app instalada abra sin conexión.
 * - Estáticos nuestros (/assets/, /icons/, /games/): caché primero. Los assets
 *   llevan hash en el nombre, así que nunca quedan viejos.
 * - API: red primero y, si falla, lo último que se haya cacheado, marcado con
 *   una cabecera para que el cliente sepa que es viejo.
 *
 * Todo lo que no sea del mismo origen pasa de largo: los iconos de Steam los
 * cachea el navegador por su cuenta.
 */
const VERSION = 'v1';
const SHELL_CACHE = `logros-shell-${VERSION}`;
const DATA_CACHE = `logros-datos-${VERSION}`;
const SHELL_URLS = ['/', '/manifest.webmanifest', '/icons/icono-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== SHELL_CACHE && key !== DATA_CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // El login de Steam es una redirección: nunca hay que tocarlo.
  if (url.pathname.startsWith('/api/auth/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(redPrimeroConShell(request));
    return;
  }

  if (/^\/(assets|icons|games)\//.test(url.pathname) || url.pathname === '/manifest.webmanifest') {
    event.respondWith(cachePrimero(request, SHELL_CACHE));
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(redPrimero(request, DATA_CACHE));
  }
});

async function redPrimeroConShell(request) {
  try {
    return await fetch(request);
  } catch {
    const cache = await caches.open(SHELL_CACHE);
    const shell = await cache.match('/');
    if (shell) return shell;
    return new Response('Sin conexión y sin copia guardada.', {
      status: 503,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }
}

async function cachePrimero(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

async function redPrimero(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    const hit = await cache.match(request);
    if (!hit) throw error;
    // Avisa de que es una copia guardada, no lo que dice Steam ahora.
    const headers = new Headers(hit.headers);
    headers.set('x-logros-cache', 'viejo');
    return new Response(hit.body, { status: hit.status, headers });
  }
}
