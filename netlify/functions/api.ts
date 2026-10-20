/**
 * Arranque para Netlify Functions (v2): una función recibe un Request estándar
 * y devuelve un Response, igual que app.fetch.
 */
import { createApp } from '../../server/app';

const app = createApp();

export default function handler(request: Request): Response | Promise<Response> {
  return app.fetch(request);
}

export const config = { path: '/api/*' };
