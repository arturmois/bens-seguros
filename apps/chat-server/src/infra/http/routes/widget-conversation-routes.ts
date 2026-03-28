import { Message } from '@repo/db-chat'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import mongoose from 'mongoose'
import { z } from 'zod'

import { widgetAuthMiddleware } from '../middleware/widget-auth.js'
import { MESSAGES_PER_PAGE } from './widget-helpers.js'

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const conversationIdParamSchema = z.object({
  id: z.string().min(1),
})

const messagesQuerySchema = z.object({
  before: z.string().optional(),
})

// ---------------------------------------------------------------------------
// Plugin: GET /widget/conversations/:id  (list messages)
// ---------------------------------------------------------------------------

export async function widgetConversationRoutes(
  app: FastifyInstance
): Promise<void> {
  app.get(
    '/conversations/:id',
    { preHandler: [widgetAuthMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const params = conversationIdParamSchema.safeParse(request.params)
      if (!params.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_PARAMS', message: 'ID inválido' },
        })
      }

      const { id } = params.data
      const visitor = request.visitorData

      if (!visitor || visitor.conversationId !== id) {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Acesso negado a esta conversa',
          },
        })
      }

      const query = messagesQuerySchema.safeParse(request.query)
      const before = query.success ? query.data.before : undefined

      const filter: Record<string, unknown> = {
        conversationId: id,
        tenantId: visitor.tenantId,
      }

      if (before && mongoose.Types.ObjectId.isValid(before)) {
        filter['_id'] = { $lt: new mongoose.Types.ObjectId(before) }
      }

      const messages = await Message.find(filter)
        .sort({ createdAt: -1 })
        .limit(MESSAGES_PER_PAGE + 1)
        .lean()
        .exec()

      const hasMore = messages.length > MESSAGES_PER_PAGE
      if (hasMore) {
        messages.pop()
      }

      messages.reverse()

      const data = messages.map((msg) => ({
        id: String(msg._id),
        conversationId: msg.conversationId,
        senderType: msg.senderType,
        senderName: msg.senderName ?? null,
        text: msg.text ?? null,
        type: msg.type,
        status: msg.status,
        createdAt: msg.createdAt,
      }))

      return reply.send({
        success: true,
        data,
        meta: { hasMore },
      })
    }
  )
}
