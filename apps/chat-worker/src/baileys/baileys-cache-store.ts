import type { CacheStore } from 'baileys'

/**
 * Creates a Baileys-compatible CacheStore backed by an in-memory Map.
 *
 * Used for `msgRetryCounterCache` and other Baileys cache options.
 * The Map is simple, synchronous, and lightweight — perfect for retry counters
 * and small ephemeral data that must persist across socket reconnections.
 */
export function createBaileysCacheStore(): CacheStore {
  const map = new Map<string, unknown>()

  return {
    get<TValue>(key: string): TValue | undefined {
      return map.get(key) as TValue | undefined
    },
    set<TValue>(key: string, value: TValue): void {
      map.set(key, value)
    },
    del(key: string): void {
      map.delete(key)
    },
    flushAll(): void {
      map.clear()
    },
  }
}
