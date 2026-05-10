import { describe, expect, it, vi } from 'vitest'
import type { CacheService } from './cache-service.js'
import { cacheAside } from './cache-aside.js'

function makeCache(): CacheService {
  return {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  }
}

describe('cacheAside', () => {
  it('returns cached value without invoking fetcher on hit', async () => {
    const cache = makeCache()
    vi.mocked(cache.get).mockResolvedValue({ x: 1 })
    const fetcher = vi.fn()
    const result = await cacheAside(cache, 'key', 60, fetcher)
    expect(result).toEqual({ x: 1 })
    expect(fetcher).not.toHaveBeenCalled()
    expect(vi.mocked(cache.set)).not.toHaveBeenCalled()
  })
  it('falls through to fetcher and populates cache on miss', async () => {
    const cache = makeCache()
    vi.mocked(cache.get).mockResolvedValue(null)
    const fetcher = vi.fn().mockResolvedValue({ x: 2 })
    const result = await cacheAside(cache, 'key', 60, fetcher)
    expect(result).toEqual({ x: 2 })
    expect(fetcher).toHaveBeenCalledOnce()
    expect(vi.mocked(cache.set)).toHaveBeenCalledWith('key', { x: 2 }, 60)
  })
  it('does not write to cache when the fetcher throws', async () => {
    const cache = makeCache()
    vi.mocked(cache.get).mockResolvedValue(null)
    const fetcher = vi.fn().mockRejectedValue(new Error('boom'))
    await expect(cacheAside(cache, 'key', 60, fetcher)).rejects.toThrow('boom')
    expect(vi.mocked(cache.set)).not.toHaveBeenCalled()
  })
  it('forwards the TTL to cache.set', async () => {
    const cache = makeCache()
    vi.mocked(cache.get).mockResolvedValue(null)
    const fetcher = vi.fn().mockResolvedValue('value')
    await cacheAside(cache, 'k', 3600, fetcher)
    expect(vi.mocked(cache.set)).toHaveBeenCalledWith('k', 'value', 3600)
  })
})
