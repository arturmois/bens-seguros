import { prisma } from './index.js'

export type TenantPrismaClient = ReturnType<typeof createTenantClient>

/**
 * Creates a Prisma client extension that sets RLS tenant context per query.
 *
 * Architecture notes:
 * - Application-level `WHERE organizationId` is the PRIMARY isolation mechanism.
 *   All repositories and routes already filter by orgId in every query.
 * - RLS via tenantPrisma is DEFENSE-IN-DEPTH for sensitive endpoints (search, leads).
 *   Not all queries go through tenantPrisma — this is by design.
 * - Uses BATCH transactions (not interactive) to avoid connection pool exhaustion.
 *   Interactive transactions hold a connection for the entire async callback duration,
 *   causing P2028 timeouts when many queries run in Promise.all.
 *   Batch transactions complete in a single roundtrip.
 *   Reference: github.com/prisma/prisma-client-extensions/tree/main/row-level-security
 */
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
