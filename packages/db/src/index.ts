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
export { ContactSource, InsuranceBranch } from '../generated/client/enums.js'
export { createTenantClient } from './tenant-client.js'
export type { TenantPrismaClient } from './tenant-client.js'
