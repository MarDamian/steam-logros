import type { CacheStore } from './types';

interface Entry {
  value: unknown;
  expiresAt: number;
}

const MAX_ENTRIES = 2000;

/** Caché en memoria del proceso (o del isolate). Es lo que se usa cuando no hay KV. */
export class MemoryCache implements CacheStore {
  private readonly map = new Map<string, Entry>();

  private prune(): void {
    const now = Date.now();
    for (const [key, entry] of this.map) {
      if (entry.expiresAt <= now) this.map.delete(key);
    }
    while (this.map.size > MAX_ENTRIES) {
      const oldest = this.map.keys().next();
      if (oldest.done) break;
      this.map.delete(oldest.value);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.map.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.map.delete(key);
      return null;
    }
    // Refresca el orden de inserción: así el desalojo se parece a un LRU.
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    this.map.delete(key);
    this.map.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
    this.prune();
  }

  async increment(key: string, ttlSeconds: number): Promise<number> {
    const current = (await this.get<number>(key)) ?? 0;
    const next = current + 1;
    const entry = this.map.get(key);
    const expiresAt = entry?.expiresAt ?? Date.now() + ttlSeconds * 1000;
    this.map.set(key, { value: next, expiresAt });
    return next;
  }

  /** Solo para pruebas. */
  clear(): void {
    this.map.clear();
  }
}
