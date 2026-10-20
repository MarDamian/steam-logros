import type { CacheStore } from './types';

/** Forma mínima de un KVNamespace de Cloudflare. */
export interface KvLike {
  get(key: string, type: 'json'): Promise<unknown>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export function isKvLike(value: unknown): value is KvLike {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate['get'] === 'function' && typeof candidate['put'] === 'function';
}

/**
 * Caché sobre Cloudflare KV. Para el limitador de peticiones KV es "eventualmente
 * consistente": dos peticiones simultáneas pueden leer el mismo contador. Sirve
 * para frenar abuso, no como contabilidad exacta.
 */
export class KvCache implements CacheStore {
  constructor(private readonly kv: KvLike) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.kv.get(key, 'json');
      return (value ?? null) as T | null;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      // KV exige un TTL mínimo de 60 segundos.
      await this.kv.put(key, JSON.stringify(value), { expirationTtl: Math.max(60, Math.round(ttlSeconds)) });
    } catch {
      /* la caché nunca debe tumbar una petición */
    }
  }

  async increment(key: string, ttlSeconds: number): Promise<number> {
    const current = (await this.get<number>(key)) ?? 0;
    const next = current + 1;
    await this.set(key, next, ttlSeconds);
    return next;
  }
}
