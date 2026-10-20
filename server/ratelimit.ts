import type { CacheStore } from './cache';
import { ApiError } from './errors';

export interface RateLimitOptions {
  /** Peticiones permitidas por ventana. */
  limit: number;
  /** Tamaño de la ventana en segundos. */
  windowSeconds: number;
}

export const DEFAULT_RATE_LIMIT: RateLimitOptions = { limit: 120, windowSeconds: 60 };

/** Ventana fija por IP. Lanza ApiError('RATE_LIMITED') al pasarse. */
export async function enforceRateLimit(
  cache: CacheStore,
  ip: string,
  options: RateLimitOptions = DEFAULT_RATE_LIMIT,
): Promise<void> {
  const window = Math.floor(Date.now() / 1000 / options.windowSeconds);
  const count = await cache.increment(`rl:${ip}:${window}`, options.windowSeconds + 5);
  if (count > options.limit) {
    throw new ApiError('RATE_LIMITED', 'Demasiadas peticiones. Esperá un momento.');
  }
}

/** IP del cliente según las cabeceras que ponen Cloudflare, Vercel y Netlify. */
export function clientIp(headers: Headers): string {
  return (
    headers.get('cf-connecting-ip') ??
    headers.get('x-real-ip') ??
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'desconocida'
  );
}
