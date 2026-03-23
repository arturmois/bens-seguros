import type { FastifyRequest, FastifyReply } from 'fastify'

const INTERNAL_API_TOKEN = process.env['INTERNAL_API_TOKEN'] ?? ''

export async function internalAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const token = request.headers['x-internal-token']
  const tenantId = request.headers['x-tenant-id']

  if (!INTERNAL_API_TOKEN || token !== INTERNAL_API_TOKEN) {
    return reply.status(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid internal token' },
    })
  }

  if (typeof tenantId !== 'string' || tenantId.length === 0) {
    return reply.status(400).send({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'X-Tenant-Id header required' },
    })
  }

  request.organizationId = tenantId
}
