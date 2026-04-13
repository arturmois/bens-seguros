import { PrismaPg } from '@prisma/adapter-pg'
import { env } from '@repo/env'
import { PrismaClient } from '../generated/client/client.js'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient
  prismaAdmin: PrismaClient
}

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30_000,
  })
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

/**
 * Admin Prisma client that bypasses RLS.
 *
 * Connects with DATABASE_ADMIN_URL (superuser role) when available.
 * Used by DI container repos and worker jobs that need cross-tenant
 * or no-tenant access. Falls back to regular `prisma` if no admin URL is set.
 *
 * The regular `prisma` (app_user with RLS) continues to be used by
 * `createTenantClient` for defense-in-depth queries.
 */
function createAdminPrismaClient(): PrismaClient {
  const adminUrl = env.DATABASE_ADMIN_URL
  if (!adminUrl) return prisma

  const adapter = new PrismaPg({
    connectionString: adminUrl,
    max: 5,
    idleTimeoutMillis: 30_000,
  })
  return new PrismaClient({ adapter })
}

export const prismaAdmin =
  globalForPrisma.prismaAdmin ?? createAdminPrismaClient()

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prismaAdmin = prismaAdmin
}

export type * from '../generated/client/client.js'
export { Prisma, PrismaClient } from '../generated/client/client.js'
export { InsuranceBranch } from '../generated/client/enums.js'
export { createTenantClient } from './tenant-client.js'
export type { TenantPrismaClient } from './tenant-client.js'
