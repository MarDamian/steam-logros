import { readFileSync } from 'node:fs';
import { createApp } from '../../server/app';

/** Qué paquete de guía sirve /games/<appid>.json durante la prueba. */
export type GuideFixture = 'ninguno' | 'real' | 'completo';

export interface LocalServerOptions {
  /** Configura el login de Steam (SESSION_SECRET y PUBLIC_BASE_URL). */
  login?: boolean;
  guide?: GuideFixture;
}

// Rutas relativas a la raíz del proyecto: en el entorno jsdom import.meta.url
// no es un file:// y no sirve para leer del disco.
const GUIDE_FILES: Record<Exclude<GuideFixture, 'ninguno'>, string> = {
  real: 'games/2358720.json',
  completo: 'tests/fixtures/guides/2358720-completo.json',
};

/**
 * Conecta el fetch global con la app Hono de verdad, en modo fixtures, y sirve
 * los paquetes de guía como los sirve Vite en desarrollo. Así las pruebas de
 * interfaz ejercitan el cliente HTTP, las rutas, el parseo con Zod y la capa de
 * guía completa, sin red y sin clave de Steam.
 */
export function useLocalServer(options: LocalServerOptions = {}): void {
  process.env.STEAM_MOCK = '1';
  if (options.login) {
    process.env.SESSION_SECRET = 'secreto-de-pruebas-suficientemente-largo';
    process.env.PUBLIC_BASE_URL = 'http://localhost:5173';
  } else {
    delete process.env.SESSION_SECRET;
    delete process.env.PUBLIC_BASE_URL;
  }

  const guide = options.guide ?? 'ninguno';
  const app = createApp();
  const origin = 'http://localhost';

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url =
      typeof input === 'string' ? new URL(input, origin) : input instanceof URL ? input : new URL(input.url);

    if (url.pathname.startsWith('/games/')) return serveGuide(url.pathname, guide);
    return await app.fetch(new Request(url, init));
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function serveGuide(pathname: string, guide: GuideFixture): Response {
  if (guide === 'ninguno') {
    return pathname === '/games/index.json' ? json({ guides: [] }) : json({ error: 'sin guía' }, 404);
  }
  if (pathname === '/games/index.json') {
    return json({ guides: [{ appid: 2358720 }] });
  }
  if (pathname === '/games/2358720.json') {
    return new Response(readFileSync(GUIDE_FILES[guide], 'utf8'), {
      headers: { 'content-type': 'application/json' },
    });
  }
  return json({ error: 'sin guía' }, 404);
}
