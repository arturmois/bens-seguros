import { prisma } from './index.js'

export type TenantPrismaClient = ReturnType<typeof createTenantClient>

export function createTenantClient(organizationId: string) {
  return prisma.$extends({
    query: {
      $allOperations({ args, query }) {
        return prisma.$transaction(async (tx) => {
          await tx.$executeRaw`SELECT set_config('app.current_tenant', ${organizationId}, true)`
          return query(args)
        })
      },
    },
  })
}
