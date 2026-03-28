import { Channel } from '@repo/db-chat'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { container } from 'tsyringe'
import { z } from 'zod'

import { GetConversation } from '../../../application/get-conversation.js'
import { ListConversations } from '../../../application/list-conversations.js'
import type { UnreadRepository } from '../../../domain/ports/unread-repository.js'
import type { ChannelType, ConversationData } from '../../../domain/types.js'
import { conversationActionRoutes } from './conversation-action-routes.js'
import { handleDomainError } from './conversation-error-handler.js'

const VALID_CHANNEL_TYPES: ReadonlySet<string> = new Set([
  'WHATSAPP',
  'WEB_CHAT',
  'MESSENGER',
  'INSTAGRAM',
])

function isChannelType(value: unknown): value is ChannelType {
  return typeof value === 'string' && VALID_CHANNEL_TYPES.has(value)
}

function toChannelType(value: unknown): ChannelType {
  if (isChannelType(value)) {
    return value
  }
  return 'WHATSAPP'
}

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

      const channelIds = [...new Set(result.data.map((c) => c.channelId))]
      const channels = await Channel.find(
        { _id: { $in: channelIds } },
        { _id: 1, type: 1 }
      ).lean()
      const channelTypeMap = new Map<string, ChannelType>(
        channels.map((ch) => [String(ch._id), toChannelType(ch.type)])
      )

      const enriched: Array<ConversationData & { channelType: ChannelType }> =
        result.data.map((conv) => ({
          ...conv,
          channelType: channelTypeMap.get(conv.channelId) ?? 'WHATSAPP',
        }))

      return reply.send({
        success: true,
        data: enriched,
        meta: result.meta,
      })
    }
  )

  app.get(
    '/chat/conversations/unread-counts',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.organizationId
      const { userId } = request.user

      const unreadRepo = container.resolve<UnreadRepository>('UnreadRepository')
      const counts = await unreadRepo.getUnreadCounts(tenantId, userId)

      const data: Record<string, number> = {}
      for (const entry of counts) {
        data[entry.conversationId] = entry.count
      }

      return reply.send({ success: true, data })
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

        const channel = await Channel.findOne({
          _id: result.conversation.channelId,
          tenantId,
        })
          .lean()
          .exec()

        return reply.send({
          success: true,
          data: {
            ...result,
            conversation: {
              ...result.conversation,
              hasAiAgent: Boolean(channel?.aiAgentId),
            },
          },
        })
      } catch (error: unknown) {
        handleDomainError(error, reply)
      }
    }
  )

  await app.register(conversationActionRoutes)
}
