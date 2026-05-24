import type { PrismaClient } from '@repo/db'
import type IORedis from 'ioredis'
import type { AppLogger } from '../logger.js'

const CACHE_PREFIX = 'socket-auth:member'
const CACHE_TTL_SECONDS = 60

export interface MembershipValidator {
  /**
   * Resolve com `true` se o user é membro ativo da org, `false` caso contrário.
   * Nunca rejeita: erros de DB e cache são absorvidos e mapeados pra `false`
   * (fail-closed). Implementadores devem manter esse contrato.
   */
  validate(organizationId: string, userId: string): Promise<boolean>
}

export interface MembershipValidatorDeps {
  /**
   * Precisa ser passado como `prismaAdmin` (RLS bypass) — middleware Socket.IO
   * roda antes de qualquer tenant context ser setado, então RLS retornaria 0 rows.
   */
  readonly prisma: PrismaClient
  readonly redis: IORedis
  readonly logger: AppLogger
}

function cacheKey(organizationId: string, userId: string): string {
  return `${CACHE_PREFIX}:${organizationId}:${userId}`
}

export function createMembershipValidator(
  deps: MembershipValidatorDeps
): MembershipValidator {
  const { prisma, redis, logger } = deps

  return {
    async validate(organizationId, userId) {
      const key = cacheKey(organizationId, userId)

      try {
        const cached = await redis.get(key)
        if (cached === '1') return true
        if (cached === '0') return false
      } catch (err) {
        logger.warn(
          { err, organizationId, userId },
          'Socket membership cache lookup failed, falling back to DB'
        )
      }

      let isValid: boolean
      try {
        const member = await prisma.member.findUnique({
          where: { organizationId_userId: { organizationId, userId } },
          select: { active: true },
        })
        isValid = Boolean(member?.active)
      } catch (err) {
        logger.error(
          { err, organizationId, userId },
          'Socket membership DB lookup failed, rejecting (fail-closed)'
        )
        return false
      }

      try {
        await redis.setex(key, CACHE_TTL_SECONDS, isValid ? '1' : '0')
      } catch (err) {
        logger.warn(
          { err, organizationId, userId },
          'Socket membership cache write failed (continuing)'
        )
      }

      return isValid
    },
  }
}
