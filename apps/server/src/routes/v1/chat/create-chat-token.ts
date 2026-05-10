import { env } from '@repo/env'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import jwt from 'jsonwebtoken'

export function createChatTokenRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/api/v1/chat/token',
    schema: {
      operationId: 'createChatToken',
      tags: ['Chat'],
      summary: 'Create a JWT token for chat authentication',
    },
    handler: async (request, reply) => {
      const userId = request.user!.id
      const name = request.user!.name
      const organizationId = request.organizationId!
      const role = request.role!
      const token = jwt.sign(
        { userId, organizationId, role, name },
        env.SOCKET_JWT_SECRET,
        {
          expiresIn: '24h',
        }
      )
      return reply.send({ success: true, data: { token } })
    },
  })
}
