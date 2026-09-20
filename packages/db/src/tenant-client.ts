import type { PrismaClient } from '../generated/client/client.js'
import { prisma } from './index.js'

export type TenantPrismaClient = PrismaClient

function isPrismaClient(client: unknown): client is PrismaClient {
  return (
    typeof client === 'object' &&
    client !== null &&
    'contact' in client &&
    'member' in client &&
    'proposal' in client &&
    'policy' in client &&
    'document' in client
  )
}

export function createTenantClient(organizationId: string): PrismaClient {
  const extended: unknown = prisma.$extends({
    query: {
      async $allOperations({ args, query }) {
        const [, result] = await prisma.$transaction([
          prisma.$executeRaw`SELECT set_config('app.current_tenant', ${organizationId}, true)`,
          query(args),
        ])
        return result
      },
    },
  })
  if (!isPrismaClient(extended)) {
    throw new Error('Tenant client is missing Prisma model delegates')
  }
  return extended
}
