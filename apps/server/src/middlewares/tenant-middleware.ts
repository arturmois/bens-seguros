import type { FastifyRequest, FastifyReply } from 'fastify'
import { createTenantClient } from '@repo/db'
import { resolveMembership } from '../lib/workspace-queries.js'

export async function tenantMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const organizationId = request.session?.activeOrganizationId
  if (!organizationId) {
    return reply.status(400).send({
      success: false,
      error: {
        code: 'NO_ORGANIZATION',
        message: 'No active organization selected',
      },
    })
  }
  if (!request.user) {
    return reply.status(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    })
  }
  const member = await resolveMembership.execute({
    userId: request.user.id,
    organizationId,
  })
  if (!member || !member.active) {
    return reply.status(403).send({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Not a member of this organization',
      },
    })
  }
  request.organizationId = organizationId
  request.role = member.role
  request.tenantPrisma = createTenantClient(organizationId)
}
