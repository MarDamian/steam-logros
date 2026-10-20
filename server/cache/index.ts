import type { Env } from '../env';
import { KvCache, isKvLike } from './kv';

export { isKvLike } from './kv';
import { MemoryCache } from './memory';
import type { CacheStore } from './types';

export type { CacheStore } from './types';
export { MemoryCache } from './memory';

const sharedMemoryCache = new MemoryCache();

/** KV si la plataforma lo ofrece; memoria si no. */
export function getCache(env: Env): CacheStore {
  return isKvLike(env.CACHE) ? new KvCache(env.CACHE) : sharedMemoryCache;
}

/** TTL en segundos por tipo de dato. */
export const TTL = {
  /** El catálogo de logros de un juego cambia con parches, no cada hora. */
  catalog: 60 * 60 * 24,
  /** Los porcentajes globales se mueven despacio. */
  globalPercentages: 60 * 60 * 6,
  /** La biblioteca cambia cuando se compra un juego. */
  library: 60 * 10,
  /** El progreso del jugador es lo más volátil. */
  progress: 60 * 5,
  /** Un "no se pudo" se recuerda poco: lo justo para no insistirle a Steam. */
  progressFailure: 60,
  player: 60 * 10,
  vanity: 60 * 60 * 24,
} as const;
