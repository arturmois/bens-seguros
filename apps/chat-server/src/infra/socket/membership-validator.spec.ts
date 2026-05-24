import type { PrismaClient } from '@repo/db'
import type IORedis from 'ioredis'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppLogger } from '../logger.js'
import { createMembershipValidator } from './membership-validator.js'

function makeLogger(): AppLogger {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  } as unknown as AppLogger
}

function makePrisma(memberResult: unknown): PrismaClient {
  return {
    member: {
      findUnique: vi.fn().mockResolvedValue(memberResult),
    },
  } as unknown as PrismaClient
}

function makeRedis(getResult: string | null): IORedis {
  return {
    get: vi.fn().mockResolvedValue(getResult),
    setex: vi.fn().mockResolvedValue('OK'),
  } as unknown as IORedis
}

describe('MembershipValidator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns true on cache hit "1" without touching DB', async () => {
    const prisma = makePrisma(null)
    const redis = makeRedis('1')
    const validator = createMembershipValidator({
      prisma,
      redis,
      logger: makeLogger(),
    })

    const result = await validator.validate('org-1', 'user-1')

    expect(result).toBe(true)
    expect(redis.get).toHaveBeenCalledWith('socket-auth:member:org-1:user-1')
    expect(prisma.member.findUnique).not.toHaveBeenCalled()
  })

  it('returns false on cache hit "0" without touching DB', async () => {
    const prisma = makePrisma({ active: true })
    const redis = makeRedis('0')
    const validator = createMembershipValidator({
      prisma,
      redis,
      logger: makeLogger(),
    })

    const result = await validator.validate('org-1', 'user-1')

    expect(result).toBe(false)
    expect(prisma.member.findUnique).not.toHaveBeenCalled()
  })

  it('falls back to DB on cache miss and caches positive result', async () => {
    const prisma = makePrisma({ active: true })
    const redis = makeRedis(null)
    const validator = createMembershipValidator({
      prisma,
      redis,
      logger: makeLogger(),
    })

    const result = await validator.validate('org-1', 'user-1')

    expect(result).toBe(true)
    expect(prisma.member.findUnique).toHaveBeenCalledWith({
      where: {
        organizationId_userId: { organizationId: 'org-1', userId: 'user-1' },
      },
      select: { active: true },
    })
    expect(redis.setex).toHaveBeenCalledWith(
      'socket-auth:member:org-1:user-1',
      60,
      '1'
    )
  })

  it('returns false when Member row is missing (cross-tenant attempt)', async () => {
    const prisma = makePrisma(null)
    const redis = makeRedis(null)
    const validator = createMembershipValidator({
      prisma,
      redis,
      logger: makeLogger(),
    })

    const result = await validator.validate('org-attacker', 'user-1')

    expect(result).toBe(false)
    expect(redis.setex).toHaveBeenCalledWith(
      'socket-auth:member:org-attacker:user-1',
      60,
      '0'
    )
  })

  it('returns false when Member.active is false (suspended member)', async () => {
    const prisma = makePrisma({ active: false })
    const redis = makeRedis(null)
    const validator = createMembershipValidator({
      prisma,
      redis,
      logger: makeLogger(),
    })

    const result = await validator.validate('org-1', 'user-1')

    expect(result).toBe(false)
  })

  it('returns false when DB lookup throws (fail-closed inside validator)', async () => {
    const prisma = {
      member: {
        findUnique: vi.fn().mockRejectedValue(new Error('db down')),
      },
    } as unknown as PrismaClient
    const redis = makeRedis(null)
    const logger = makeLogger()
    const validator = createMembershipValidator({ prisma, redis, logger })

    const result = await validator.validate('org-1', 'user-1')

    expect(result).toBe(false)
    expect(logger.error).toHaveBeenCalled()
    expect(redis.setex).not.toHaveBeenCalled()
  })

  it('falls back to DB when Redis get throws (cache down)', async () => {
    const prisma = makePrisma({ active: true })
    const redis = {
      get: vi.fn().mockRejectedValue(new Error('redis unreachable')),
      setex: vi.fn().mockRejectedValue(new Error('redis unreachable')),
    } as unknown as IORedis
    const logger = makeLogger()
    const validator = createMembershipValidator({ prisma, redis, logger })

    const result = await validator.validate('org-1', 'user-1')

    expect(result).toBe(true)
    expect(prisma.member.findUnique).toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalled()
  })
})
