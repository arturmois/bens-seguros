import type { CacheService } from './cache-service.js'

export async function cacheAside<T>(
  cache: CacheService,
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = await cache.get<T>(key)
  if (cached !== null) {
    return cached
  }
  const fresh = await fetcher()
  await cache.set(key, fresh, ttlSeconds)
  return fresh
}
