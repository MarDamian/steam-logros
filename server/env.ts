import type { SteamLanguage } from '../shared/types';

/** Variables de entorno del servidor. En Cloudflare llegan como bindings; en
 *  Node/Vercel/Netlify como process.env. Nunca se exponen al cliente. */
export interface Env {
  STEAM_API_KEY?: string;
  SESSION_SECRET?: string;
  PUBLIC_BASE_URL?: string;
  DEMO_STEAMID?: string;
  STEAM_MOCK?: string;
  DEFAULT_STEAM_LANGUAGE?: string;
  /** Namespace KV opcional de Cloudflare. Si falta, la caché vive en memoria. */
  CACHE?: unknown;
}

export const DEFAULT_DEMO_STEAMID = '76561198000000001';

/** Une los bindings de la plataforma con process.env cuando existe. */
export function readEnv(bindings: unknown): Env {
  const fromProcess =
    typeof process !== 'undefined' && process.env ? (process.env as Record<string, string | undefined>) : {};
  const fromBindings = (bindings ?? {}) as Record<string, unknown>;
  return { ...fromProcess, ...fromBindings };
}

export function isMockMode(env: Env): boolean {
  const flag = (env.STEAM_MOCK ?? '').trim().toLowerCase();
  if (flag === '1' || flag === 'true' || flag === 'yes') return true;
  // Sin clave no hay forma de hablar con Steam: caemos a fixtures para que la
  // app siga siendo explorable en local, pero lo decimos en /api/config.
  return !env.STEAM_API_KEY;
}

export function defaultLanguage(env: Env): SteamLanguage {
  return (env.DEFAULT_STEAM_LANGUAGE ?? '').toLowerCase() === 'english' ? 'english' : 'spanish';
}

export function demoSteamId(env: Env): string {
  const raw = (env.DEMO_STEAMID ?? '').trim();
  return /^\d{17}$/.test(raw) ? raw : DEFAULT_DEMO_STEAMID;
}
