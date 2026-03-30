import { PrismaClient } from '../generated/client/client.js'
import { PrismaPg } from '@prisma/adapter-pg'
import { env } from '@repo/env'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

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

export { PrismaClient, Prisma } from '../generated/client/client.js'
export type * from '../generated/client/client.js'
export { InsuranceBranch } from '../generated/client/enums.js'
export { createTenantClient } from './tenant-client.js'
export type { TenantPrismaClient } from './tenant-client.js'
