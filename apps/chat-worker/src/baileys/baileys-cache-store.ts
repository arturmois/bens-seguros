import type { CacheStore } from 'baileys'

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
