import jwt from 'jsonwebtoken'
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { env } from '@repo/env'
import { tenantMiddleware } from '../../middlewares/tenant-middleware.js'

export async function chatTokenRoute(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', tenantMiddleware)

  app.post(
    '/api/v1/chat/token',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (
        !request.user?.id ||
        !request.user.name ||
        !request.organizationId ||
        !request.role
      ) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Usuário não autenticado' },
        })
      }

      const userId = request.user.id
      const name = request.user.name
      const organizationId = request.organizationId
      const role = request.role

      const token = jwt.sign(
        { userId, organizationId, role, name },
        env.SOCKET_JWT_SECRET,
        {
          expiresIn: '24h',
        }
      )

      return reply.send({ success: true, data: { token } })
    }
  )
}
