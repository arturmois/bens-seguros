import { prisma } from './index.js'

export type TenantPrismaClient = ReturnType<typeof createTenantClient>

export function createTenantClient(organizationId: string) {
  return prisma.$extends({
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
}
