import { prisma } from './index.js'

export type TenantPrismaClient = ReturnType<typeof createTenantClient>

export function createTenantClient(organizationId: string) {
  return prisma.$extends({
    query: {
      $allOperations({ args, query }) {
        // Note: query(args) runs within the $transaction's async context.
        // Prisma 7 uses AsyncLocalStorage to propagate the tx connection,
        // so set_config and query share the same database connection.
        return prisma.$transaction(async (tx) => {
          await tx.$executeRaw`SELECT set_config('app.current_tenant', ${organizationId}, true)`
          return query(args)
        })
      },
    },
  })
}
