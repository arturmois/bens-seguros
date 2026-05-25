import type { Entitlements } from '@repo/auth/entitlements'
import type { Role } from '@repo/auth/roles'
import type { AuthSession, AuthUser } from '@repo/auth/types'
import type { TenantPrismaClient } from '@repo/db'
import type { SubscriptionSnapshot } from '../lib/subscription-cache.js'

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser
    session?: AuthSession
    organizationId?: string
    role?: Role
    tenantPrisma?: TenantPrismaClient
    subscription?: SubscriptionSnapshot
    entitlements?: Entitlements
  }
}
