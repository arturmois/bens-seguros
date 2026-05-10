import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RedisCacheService } from './cache-service.js'

function makeMockRedis() {
  return {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  }
}

describe('RedisCacheService', () => {
  let mockRedis: ReturnType<typeof makeMockRedis>
  let cache: RedisCacheService
  beforeEach(() => {
    mockRedis = makeMockRedis()
    cache = new RedisCacheService(mockRedis as never)
  })
  describe('get', () => {
    it('returns parsed value when key exists', async () => {
      const data = { id: '1', name: 'Test' }
      mockRedis.get.mockResolvedValue(JSON.stringify(data))
      const result = await cache.get<typeof data>('test-key')
      expect(result).toEqual(data)
      expect(mockRedis.get).toHaveBeenCalledWith('test-key')
    })
    it('returns null when key does not exist', async () => {
      mockRedis.get.mockResolvedValue(null)
      const result = await cache.get('missing-key')
      expect(result).toBeNull()
    })
    it('returns null silently on Redis error', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'))
      const result = await cache.get('error-key')
      expect(result).toBeNull()
    })
  })
  describe('set', () => {
    it('serializes value and sets TTL', async () => {
      mockRedis.set.mockResolvedValue('OK')
      const data = [{ id: '1' }, { id: '2' }]
      await cache.set('my-key', data, 3600)
      expect(mockRedis.set).toHaveBeenCalledWith(
        'my-key',
        JSON.stringify(data),
        'EX',
        3600
      )
    })
    it('fails silently on Redis error', async () => {
      mockRedis.set.mockRejectedValue(new Error('Redis write failed'))
      await expect(cache.set('fail-key', { x: 1 }, 60)).resolves.toBeUndefined()
    })
  })
  describe('delete', () => {
    it('deletes the key from Redis', async () => {
      mockRedis.del.mockResolvedValue(1)
      await cache.delete('del-key')
      expect(mockRedis.del).toHaveBeenCalledWith('del-key')
    })
    it('fails silently on Redis error', async () => {
      mockRedis.del.mockRejectedValue(new Error('Redis delete failed'))
      await expect(cache.delete('fail-del-key')).resolves.toBeUndefined()
    })
  })
})
