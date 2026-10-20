/**
 * Arranque para Cloudflare Workers.
 *
 * Los estáticos los sirve el binding ASSETS (declarado en wrangler.jsonc), que
 * va por la red de Cloudflare sin ejecutar este código. El Worker solo se
 * ocupa de /api/*; cualquier otra ruta se delega a ASSETS, que con
 * not_found_handling: single-page-application devuelve index.html y deja que
 * el router del cliente haga lo suyo.
 *
 * Las variables (STEAM_API_KEY, SESSION_SECRET…) llegan como bindings en `env`.
 * Acá no existe process.env, y readEnv() ya lo tiene en cuenta.
 */
import type { ExecutionContext } from 'hono';
import { createApp } from '../app';
import type { Env } from '../env';

interface WorkerEnv extends Env {
  ASSETS?: { fetch: (request: Request) => Promise<Response> };
}

const app = createApp();

export default {
  async fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      return await app.fetch(request, env, ctx);
    }
    if (env.ASSETS) {
      return await env.ASSETS.fetch(request);
    }
    // Sin binding de estáticos (p. ej. `wrangler dev` sin assets) igual contestamos.
    return await app.fetch(request, env, ctx);
  },
};
