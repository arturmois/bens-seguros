import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type IORedis from 'ioredis'
import { createInternalRateLimitHook } from '../internal-rate-limit.js'

function createFakeRedis(): IORedis {
  const sortedSets = new Map<string, Map<string, number>>()

  function ensureSet(key: string): Map<string, number> {
    let bucket = sortedSets.get(key)
    if (!bucket) {
      bucket = new Map()
      sortedSets.set(key, bucket)
    }
    return bucket
  }

  type PipelineOp = () => number
  interface FakePipeline {
    zremrangebyscore: (key: string, min: number, max: number) => FakePipeline
    zadd: (key: string, score: string, member: string) => FakePipeline
    zcard: (key: string) => FakePipeline
    expire: (key: string, seconds: number) => FakePipeline
    exec: () => Promise<Array<[null, number]>>
  }

  function pipeline(): FakePipeline {
    const ops: PipelineOp[] = []
    const p: FakePipeline = {
      zremrangebyscore(key, min, max) {
        ops.push(() => {
          const bucket = ensureSet(key)
          for (const [member, score] of bucket) {
            if (score >= min && score <= max) bucket.delete(member)
          }
          return 0
        })
        return p
      },
      zadd(key, score, member) {
        ops.push(() => {
          ensureSet(key).set(member, Number(score))
          return 1
        })
        return p
      },
      zcard(key) {
        ops.push(() => sortedSets.get(key)?.size ?? 0)
        return p
      },
      expire() {
        ops.push(() => 1)
        return p
      },
      async exec() {
        return ops.map((op) => [null, op()])
      },
    }
    return p
  }

  const fake = {
    pipeline,
    async zrem(key: string, member: string) {
      const bucket = sortedSets.get(key)
      if (!bucket) return 0
      return bucket.delete(member) ? 1 : 0
    },
    async zrange(
      key: string,
      start: number,
      stop: number,
      _withScores: 'WITHSCORES'
    ) {
      const bucket = sortedSets.get(key)
      if (!bucket) return []
      const sorted = [...bucket.entries()].sort((a, b) => a[1] - b[1])
      const sliced = sorted.slice(start, stop + 1)
      const result: string[] = []
      for (const [member, score] of sliced) {
        result.push(member, String(score))
      }
      return result
    },
  }

  return fake as unknown as IORedis
}

function makeRequest(options: {
  organizationId?: string
  ip?: string
}): FastifyRequest {
  return {
    organizationId: options.organizationId,
    ip: options.ip ?? '127.0.0.1',
  } as unknown as FastifyRequest
}

function makeReply(): FastifyReply {
  const reply = {
    status: vi.fn().mockReturnThis(),
    header: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  }
  return reply as unknown as FastifyReply
}

describe('createInternalRateLimitHook', () => {
  let redis: IORedis
  let hook: ReturnType<typeof createInternalRateLimitHook>

  beforeEach(() => {
    redis = createFakeRedis()
    hook = createInternalRateLimitHook(redis)
  })

  it('allows requests below the limit', async () => {
    const reply = makeReply()
    await hook(makeRequest({ organizationId: 'org-1' }), reply)
    expect(reply.status).not.toHaveBeenCalled()
  })

  it('blocks org when it exceeds the INTERNAL rate limit (20 per 60s)', async () => {
    const request = makeRequest({ organizationId: 'org-1' })
    for (let i = 0; i < 20; i++) {
      await hook(request, makeReply())
    }
    const reply = makeReply()
    await hook(request, reply)
    expect(reply.status).toHaveBeenCalledWith(429)
  })

  it('does not let one org consume the quota of another', async () => {
    const requestA = makeRequest({ organizationId: 'org-a' })
    for (let i = 0; i < 20; i++) {
      await hook(requestA, makeReply())
    }
    const replyA = makeReply()
    await hook(requestA, replyA)
    expect(replyA.status).toHaveBeenCalledWith(429)

    const replyB = makeReply()
    await hook(makeRequest({ organizationId: 'org-b' }), replyB)
    expect(replyB.status).not.toHaveBeenCalled()
  })

  it('falls back to per-IP bucket when organizationId is missing', async () => {
    const ip = '10.0.0.42'
    for (let i = 0; i < 20; i++) {
      await hook(makeRequest({ ip }), makeReply())
    }
    const reply = makeReply()
    await hook(makeRequest({ ip }), reply)
    expect(reply.status).toHaveBeenCalledWith(429)
  })

  it('keeps org and IP buckets separate', async () => {
    const sharedIp = '10.0.0.10'
    for (let i = 0; i < 20; i++) {
      await hook(makeRequest({ ip: sharedIp }), makeReply())
    }
    const replyIp = makeReply()
    await hook(makeRequest({ ip: sharedIp }), replyIp)
    expect(replyIp.status).toHaveBeenCalledWith(429)

    const replyOrg = makeReply()
    await hook(makeRequest({ organizationId: 'org-1', ip: sharedIp }), replyOrg)
    expect(replyOrg.status).not.toHaveBeenCalled()
  })

  it('returns 429 with Retry-After header and structured error body', async () => {
    const request = makeRequest({ organizationId: 'org-1' })
    for (let i = 0; i < 20; i++) {
      await hook(request, makeReply())
    }
    const reply = makeReply()
    await hook(request, reply)
    expect(reply.status).toHaveBeenCalledWith(429)
    expect(reply.header).toHaveBeenCalledWith('Retry-After', expect.any(String))
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'RATE_LIMIT_EXCEEDED',
        }),
      })
    )
  })
})
