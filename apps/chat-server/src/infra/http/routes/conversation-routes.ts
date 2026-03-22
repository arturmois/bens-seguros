import { container } from 'tsyringe'
import { z } from 'zod'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

import { ListConversations } from '../../../application/list-conversations.js'
import { GetConversation } from '../../../application/get-conversation.js'
import { handleDomainError } from './conversation-error-handler.js'
import { conversationActionRoutes } from './conversation-action-routes.js'

const conversationIdSchema = z.object({ id: z.string().min(1) })

const listQuerySchema = z.object({
  status: z
    .enum(['BOT_ACTIVE', 'WAITING_HUMAN', 'HUMAN_ACTIVE', 'CLOSED'])
    .optional(),
  assignedTo: z.string().optional(),
  search: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export async function conversationRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/chat/conversations',
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof listQuerySchema> }>,
      reply: FastifyReply
    ) => {
      const query = listQuerySchema.parse(request.query)
      const tenantId = request.organizationId

      const useCase = container.resolve(ListConversations)
      const result = await useCase.execute(
        {
          tenantId,
          status: query.status,
          assignedTo: query.assignedTo,
          search: query.search,
        },
        { cursor: query.cursor, limit: query.limit }
      )

      return reply.send({
        success: true,
        data: result.data,
        meta: result.meta,
      })
    }
  )

  app.get(
    '/chat/conversations/:id',
    async (
      request: FastifyRequest<{ Params: z.infer<typeof conversationIdSchema> }>,
      reply: FastifyReply
    ) => {
      const { id } = conversationIdSchema.parse(request.params)
      const tenantId = request.organizationId

      try {
        const useCase = container.resolve(GetConversation)
        const result = await useCase.execute(id, tenantId)

        return reply.send({ success: true, data: result })
      } catch (error: unknown) {
        handleDomainError(error, reply)
      }
    }
  )

  await app.register(conversationActionRoutes)
}
