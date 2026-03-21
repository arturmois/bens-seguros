import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@repo/db';

export async function tenantMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const organizationId = request.session?.activeOrganizationId;

  if (!organizationId) {
    return reply.status(400).send({
      success: false,
      error: { code: 'NO_ORGANIZATION', message: 'No active organization selected' },
    });
  }

  const member = await prisma.member.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId: request.user.id,
      },
    },
  });

  if (!member || !member.active) {
    return reply.status(403).send({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Not a member of this organization' },
    });
  }

  request.organizationId = organizationId;
  request.role = member.role;
}
