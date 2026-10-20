import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Ejecuta public/sw.js con globales simulados y comprueba qué estrategia aplica
 * a cada ruta.
 *
 * La prueba existe por un error concreto: /games/*.json se servía con caché
 * primero, igual que los bundles, pero esos archivos no llevan hash en el
 * nombre. Resultado: el navegador se quedaba con el paquete de guía viejo para
 * siempre. Caché primero solo vale para nombres que nunca cambian de contenido.
 */
const FUENTE = readFileSync('public/sw.js', 'utf8');

type Handler = (event: { request: Request; respondWith: (r: Promise<Response> | Response) => void }) => void;

interface Entorno {
  manejarFetch: Handler;
  red: ReturnType<typeof vi.fn>;
  cacheMatch: ReturnType<typeof vi.fn>;
  cachePut: ReturnType<typeof vi.fn>;
}

function cargarServiceWorker(respuestaEnCache: Response | undefined): Entorno {
  const handlers = new Map<string, Handler>();
  const cacheMatch = vi.fn(async () => respuestaEnCache);
  const cachePut = vi.fn(async () => undefined);
  const red = vi.fn(async () => new Response('de la red', { status: 200 }));

  const self = {
    addEventListener: (tipo: string, handler: Handler) => handlers.set(tipo, handler),
    location: { origin: 'https://ejemplo.test' },
    skipWaiting: () => undefined,
    clients: { claim: () => undefined },
  };
  const caches = {
    open: async () => ({ match: cacheMatch, put: cachePut, addAll: async () => undefined }),
    keys: async () => [],
    delete: async () => true,
  };

  // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
  const ejecutar = new Function('self', 'caches', 'fetch', 'Response', 'Request', 'URL', FUENTE) as (
    ...args: unknown[]
  ) => void;
  ejecutar(self, caches, red, Response, Request, URL);

  const manejarFetch = handlers.get('fetch');
  if (!manejarFetch) throw new Error('el service worker no registró un handler de fetch');
  return { manejarFetch, red, cacheMatch, cachePut };
}

async function pedir(entorno: Entorno, path: string, init?: { mode?: string; method?: string }) {
  let respuesta: Promise<Response> | Response | undefined;
  const request = new Request(`https://ejemplo.test${path}`, { method: init?.method ?? 'GET' });
  if (init?.mode) Object.defineProperty(request, 'mode', { value: init.mode });

  entorno.manejarFetch({
    request,
    respondWith: (r) => {
      respuesta = r;
    },
  });
  if (respuesta !== undefined) await respuesta;
  return { contestado: respuesta !== undefined };
}

describe('estrategias del service worker', () => {
  let conCache: Entorno;
  let sinCache: Entorno;

  beforeEach(() => {
    conCache = cargarServiceWorker(new Response('de la caché', { status: 200 }));
    sinCache = cargarServiceWorker(undefined);
  });

  it('los bundles con hash salen de la caché sin tocar la red', async () => {
    await pedir(conCache, '/assets/index-ABC123.js');
    expect(conCache.cacheMatch).toHaveBeenCalled();
    expect(conCache.red).not.toHaveBeenCalled();
  });

  it('los paquetes de guía van SIEMPRE a la red primero', async () => {
    // No llevan hash en el nombre: con caché primero quedaban pegados.
    await pedir(conCache, '/games/2358720.json');
    expect(conCache.red).toHaveBeenCalled();
  });

  it('el índice de guías también va a la red primero', async () => {
    await pedir(conCache, '/games/index.json');
    expect(conCache.red).toHaveBeenCalled();
  });

  it('los iconos y el manifest tampoco se quedan pegados', async () => {
    await pedir(conCache, '/icons/icono-192.png');
    expect(conCache.red).toHaveBeenCalled();

    const otro = cargarServiceWorker(new Response('viejo'));
    await pedir(otro, '/manifest.webmanifest');
    expect(otro.red).toHaveBeenCalled();
  });

  it('la API va a la red primero', async () => {
    await pedir(conCache, '/api/library/76561198000000001');
    expect(conCache.red).toHaveBeenCalled();
  });

  it('el login de Steam no pasa por el service worker', async () => {
    const { contestado } = await pedir(conCache, '/api/auth/steam/start');
    expect(contestado).toBe(false);
    expect(conCache.red).not.toHaveBeenCalled();
  });

  it('las peticiones que no son GET pasan de largo', async () => {
    const { contestado } = await pedir(conCache, '/api/auth/logout', { method: 'POST' });
    expect(contestado).toBe(false);
  });

  it('sin red, un paquete de guía cae a la copia guardada', async () => {
    const entorno = cargarServiceWorker(new Response('paquete guardado', { status: 200 }));
    entorno.red.mockRejectedValue(new Error('sin conexión'));
    await pedir(entorno, '/games/2358720.json');
    expect(entorno.cacheMatch).toHaveBeenCalled();
  });

  it('sin red y sin copia, no inventa una respuesta', async () => {
    sinCache.red.mockRejectedValue(new Error('sin conexión'));
    let fallo: unknown = null;
    const request = new Request('https://ejemplo.test/games/2358720.json');
    sinCache.manejarFetch({
      request,
      respondWith: (r) => {
        void Promise.resolve(r).catch((error: unknown) => {
          fallo = error;
        });
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(fallo).toBeInstanceOf(Error);
  });
});
