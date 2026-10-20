export interface CacheStore {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  /** Para contadores del limitador de peticiones. */
  increment(key: string, ttlSeconds: number): Promise<number>;
}
