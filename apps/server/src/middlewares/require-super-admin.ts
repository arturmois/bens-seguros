import type { FastifyReply, FastifyRequest } from 'fastify'

export async function requireSuperAdmin(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (!request.user) {
    await reply.status(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    })
    return
  }
  if (request.user.isSuperAdmin !== true) {
    await reply.status(403).send({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Super-admin access required' },
    })
    return
  }
}
