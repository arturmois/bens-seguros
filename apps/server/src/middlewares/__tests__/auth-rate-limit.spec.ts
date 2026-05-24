import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type IORedis from 'ioredis'
import { createAuthRateLimitHook } from '../auth-rate-limit.js'

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
  url: string
  ip?: string
  body?: unknown
}): FastifyRequest {
  return {
    url: options.url,
    ip: options.ip ?? '127.0.0.1',
    body: options.body,
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

describe('createAuthRateLimitHook', () => {
  let redis: IORedis
  let hook: ReturnType<typeof createAuthRateLimitHook>

  beforeEach(() => {
    redis = createFakeRedis()
    hook = createAuthRateLimitHook(redis)
  })

  describe('non-auth paths', () => {
    it('ignores unmatched paths without sending response', async () => {
      const reply = makeReply()
      await hook(makeRequest({ url: '/api/something-else' }), reply)
      expect(reply.status).not.toHaveBeenCalled()
    })
  })

  describe('/sign-in/email (login)', () => {
    it('rate-limits per email (10 per 15min)', async () => {
      const reply = makeReply()
      const request = makeRequest({
        url: '/api/auth/sign-in/email',
        body: { email: 'user@example.com' },
      })
      for (let i = 0; i < 10; i++) {
        await hook(request, makeReply())
      }
      await hook(request, reply)
      expect(reply.status).toHaveBeenCalledWith(429)
    })

    it('allows different emails independently', async () => {
      for (let i = 0; i < 10; i++) {
        const reply = makeReply()
        await hook(
          makeRequest({
            url: '/api/auth/sign-in/email',
            body: { email: 'a@example.com' },
          }),
          reply
        )
      }
      const reply = makeReply()
      await hook(
        makeRequest({
          url: '/api/auth/sign-in/email',
          body: { email: 'b@example.com' },
        }),
        reply
      )
      expect(reply.status).not.toHaveBeenCalled()
    })
  })

  describe('/sign-up/email (signup) — C1 dual key', () => {
    it('blocks signup when IP exceeds REGISTRATION limit (5/h) even with different emails', async () => {
      const ip = '10.0.0.1'
      for (let i = 0; i < 5; i++) {
        await hook(
          makeRequest({
            url: '/api/auth/sign-up/email',
            ip,
            body: { email: `user-${String(i)}@example.com` },
          }),
          makeReply()
        )
      }
      const reply = makeReply()
      await hook(
        makeRequest({
          url: '/api/auth/sign-up/email',
          ip,
          body: { email: 'user-6@example.com' },
        }),
        reply
      )
      expect(reply.status).toHaveBeenCalledWith(429)
    })

    it('blocks signup when EMAIL exceeds REGISTRATION_EMAIL limit (3/h) even with different IPs', async () => {
      const email = 'target@example.com'
      for (let i = 0; i < 3; i++) {
        await hook(
          makeRequest({
            url: '/api/auth/sign-up/email',
            ip: `10.0.0.${String(i + 1)}`,
            body: { email },
          }),
          makeReply()
        )
      }
      const reply = makeReply()
      await hook(
        makeRequest({
          url: '/api/auth/sign-up/email',
          ip: '10.0.0.99',
          body: { email },
        }),
        reply
      )
      expect(reply.status).toHaveBeenCalledWith(429)
    })

    it('normalizes email to lowercase before bucketing', async () => {
      const ip = '10.0.0.1'
      for (let i = 0; i < 3; i++) {
        await hook(
          makeRequest({
            url: '/api/auth/sign-up/email',
            ip: `10.0.0.${String(i + 1)}`,
            body: { email: 'User@Example.com' },
          }),
          makeReply()
        )
      }
      const reply = makeReply()
      await hook(
        makeRequest({
          url: '/api/auth/sign-up/email',
          ip,
          body: { email: 'user@example.com' },
        }),
        reply
      )
      expect(reply.status).toHaveBeenCalledWith(429)
    })

    it('uses unknown bucket when email body is missing or invalid', async () => {
      for (let i = 0; i < 3; i++) {
        await hook(
          makeRequest({
            url: '/api/auth/sign-up/email',
            ip: `10.0.0.${String(i + 1)}`,
            body: {},
          }),
          makeReply()
        )
      }
      const reply = makeReply()
      await hook(
        makeRequest({
          url: '/api/auth/sign-up/email',
          ip: '10.0.0.99',
          body: undefined,
        }),
        reply
      )
      expect(reply.status).toHaveBeenCalledWith(429)
    })

    it('allows signup when both IP and email are below their limits', async () => {
      const reply = makeReply()
      await hook(
        makeRequest({
          url: '/api/auth/sign-up/email',
          ip: '10.0.0.1',
          body: { email: 'new@example.com' },
        }),
        reply
      )
      expect(reply.status).not.toHaveBeenCalled()
    })

    it('returns 429 with Retry-After header and structured error body', async () => {
      const email = 'target@example.com'
      for (let i = 0; i < 3; i++) {
        await hook(
          makeRequest({
            url: '/api/auth/sign-up/email',
            ip: `10.0.0.${String(i + 1)}`,
            body: { email },
          }),
          makeReply()
        )
      }
      const reply = makeReply()
      await hook(
        makeRequest({
          url: '/api/auth/sign-up/email',
          ip: '10.0.0.99',
          body: { email },
        }),
        reply
      )
      expect(reply.status).toHaveBeenCalledWith(429)
      expect(reply.header).toHaveBeenCalledWith(
        'Retry-After',
        expect.any(String)
      )
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

  describe('/forget-password', () => {
    it('rate-limits per email (3/h)', async () => {
      const request = makeRequest({
        url: '/api/auth/forget-password',
        body: { email: 'user@example.com' },
      })
      for (let i = 0; i < 3; i++) {
        await hook(request, makeReply())
      }
      const reply = makeReply()
      await hook(request, reply)
      expect(reply.status).toHaveBeenCalledWith(429)
    })
  })

  describe('/send-verification-email', () => {
    it('rate-limits per email (3/h)', async () => {
      const request = makeRequest({
        url: '/api/auth/send-verification-email',
        body: { email: 'user@example.com' },
      })
      for (let i = 0; i < 3; i++) {
        await hook(request, makeReply())
      }
      const reply = makeReply()
      await hook(request, reply)
      expect(reply.status).toHaveBeenCalledWith(429)
    })
  })
})
