import { prisma } from './index.js'

export type TenantPrismaClient = ReturnType<typeof createTenantClient>

export function createTenantClient(organizationId: string) {
  return prisma.$extends({
    query: {
      $allOperations({ args, query }) {
        return prisma.$transaction(async (tx) => {
          await tx.$executeRawUnsafe(
            `SET LOCAL app.current_tenant = '${organizationId.replace(/'/g, "''")}'`
          )
          return query(args)
        })
      },
    },
  })
}
