import { createApp } from '../../server/app';

/**
 * Conecta el fetch global con la app Hono de verdad, en modo fixtures.
 * Así las pruebas de interfaz ejercitan el cliente HTTP, las rutas, el parseo
 * con Zod y los fixtures, sin red y sin clave de Steam.
 */
export interface LocalServerOptions {
  /** Configura el login de Steam (SESSION_SECRET y PUBLIC_BASE_URL). */
  login?: boolean;
}

export function useLocalServer(options: LocalServerOptions = {}): void {
  process.env.STEAM_MOCK = '1';
  if (options.login) {
    process.env.SESSION_SECRET = 'secreto-de-pruebas-suficientemente-largo';
    process.env.PUBLIC_BASE_URL = 'http://localhost:5173';
  } else {
    delete process.env.SESSION_SECRET;
    delete process.env.PUBLIC_BASE_URL;
  }
  const app = createApp();
  const origin = 'http://localhost';

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url =
      typeof input === 'string' ? new URL(input, origin) : input instanceof URL ? input : new URL(input.url);
    return await app.fetch(new Request(url, init));
  };
}
