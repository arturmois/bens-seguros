import { prisma } from './index.js';
import type { PrismaClient } from '../generated/client/index.js';

export function createTenantClient(organizationId: string) {
  return prisma.$extends({
    query: {
      $allOperations({ args, query }) {
        return prisma.$transaction(async (tx) => {
          await tx.$executeRawUnsafe(
            `SET LOCAL app.current_tenant = '${organizationId}'`,
          );
          return query(args);
        });
      },
    },
  });
}
