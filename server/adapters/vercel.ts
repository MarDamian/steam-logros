/**
 * Arranque para Vercel Functions. api/[[route]].ts solo reexporta esto.
 * El adaptador es una línea: una función de Vercel recibe un Request estándar
 * y devuelve un Response, que es exactamente la firma de app.fetch.
 */
import { createApp } from '../app';

const app = createApp();

export default function handler(request: Request): Response | Promise<Response> {
  // En Vercel las variables viven en process.env, que readEnv() ya lee.
  return app.fetch(request);
}
