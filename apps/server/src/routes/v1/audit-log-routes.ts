import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@repo/db';
import type { Prisma } from '@repo/db';
import { tenantMiddleware } from '../../middlewares/tenant-middleware.js';
import { requireAbility } from '../../middlewares/ability-middleware.js';
import { listAuditLogsQuerySchema } from '../../schemas/audit-log.schemas.js';

export async function auditLogRoutes(app: FastifyInstance) {
  app.addHook('preHandler', tenantMiddleware);

  app.get(
    '/api/v1/audit-logs',
    { preHandler: [requireAbility('manage', 'all')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { entityType, action, userId, dateFrom, dateTo, cursor, limit } =
        listAuditLogsQuerySchema.parse(request.query);

      const orgId = request.organizationId!;

      const where: Prisma.AuditLogWhereInput = {
        organizationId: orgId,
        ...(entityType ? { entityType } : {}),
        ...(action ? { action } : {}),
        ...(userId ? { userId } : {}),
        ...(dateFrom || dateTo
          ? {
              createdAt: {
                ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                ...(dateTo ? { lte: new Date(dateTo) } : {}),
              },
            }
          : {}),
      };

      const [items, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: limit + 1,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        }),
        prisma.auditLog.count({ where: { organizationId: orgId } }),
      ]);

      const hasMore = items.length > limit;
      if (hasMore) items.pop();

      const nextCursor = hasMore ? (items.at(-1)?.id ?? null) : null;

      return reply.send({
        success: true,
        data: items,
        meta: { total, nextCursor },
      });
    },
  );
}
