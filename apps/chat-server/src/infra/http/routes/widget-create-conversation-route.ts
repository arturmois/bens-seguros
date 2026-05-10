import { Channel, Contact, Conversation, Message } from '@repo/db-chat'
import { CHAT_PUBSUB_CHANNELS } from '@repo/shared'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { signVisitorToken } from '../middleware/widget-auth.js'
import {
  getChannelConfig,
  isValidObjectId,
  isValidOrigin,
} from './widget-helpers.js'

const BR_PHONE_REGEX = /^\+?55\d{10,11}$/

const createConversationBodySchema = z.object({
  channelId: z.string().min(1),
  name: z.string().min(2).max(100),
  phone: z.string().regex(BR_PHONE_REGEX, 'Telefone brasileiro inválido'),
  email: z.string().email('E-mail inválido').optional(),
})

export async function widgetCreateConversationRoute(
  app: FastifyInstance
): Promise<void> {
  app.post(
    '/conversations',
    async (
      request: FastifyRequest<{
        Body: z.infer<typeof createConversationBodySchema>
      }>,
      reply: FastifyReply
    ) => {
      const parsed = createConversationBodySchema.safeParse(request.body)
      if (!parsed.success) {
        const firstIssue = parsed.error.issues[0]
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: firstIssue?.message ?? 'Dados inválidos',
          },
        })
      }
      const { channelId, name, phone, email } = parsed.data
      if (!isValidObjectId(channelId)) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'CHANNEL_NOT_FOUND',
            message: 'Canal não encontrado',
          },
        })
      }
      const channel = await Channel.findOne({
        _id: channelId,
        isActive: true,
        type: 'WEB_CHAT',
      })
        .lean()
        .exec()
      if (!channel) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'CHANNEL_NOT_FOUND',
            message: 'Canal não encontrado',
          },
        })
      }
      const { allowedOrigins, welcomeMessage } = getChannelConfig(
        channel.config
      )
      const requestOrigin = request.headers.origin
      if (!isValidOrigin(allowedOrigins, requestOrigin)) {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'ORIGIN_NOT_ALLOWED',
            message: 'Origem não permitida',
          },
        })
      }
      const tenantId = String(channel.tenantId)
      const contact = await Contact.findOneAndUpdate(
        { tenantId, whatsappPhone: phone },
        {
          $set: { name, source: 'WEB_CHAT', ...(email ? { email } : {}) },
          $setOnInsert: { tenantId, whatsappPhone: phone },
        },
        { upsert: true, new: true }
      )
        .lean()
        .exec()
      const contactId = String(contact._id)
      const existingConversation = await Conversation.findOne({
        tenantId,
        contactId,
        channelId,
        status: { $ne: 'CLOSED' },
      })
        .lean()
        .exec()
      let conversationId: string
      let isNew = false
      if (existingConversation) {
        conversationId = String(existingConversation._id)
      } else {
        const initialStatus = channel.aiAgentId ? 'BOT_ACTIVE' : 'WAITING_HUMAN'
        const now = new Date()
        const newConversation = await Conversation.create({
          tenantId,
          channelId,
          contactId,
          status: initialStatus,
          whatsappPhone: phone,
          lastMessageText: welcomeMessage,
          lastMessageAt: now,
        })
        conversationId = String(newConversation._id)
        isNew = true
        await Message.create({
          conversationId,
          tenantId,
          senderType: 'SYSTEM',
          text: welcomeMessage,
          type: 'TEXT',
          status: 'DELIVERED',
        })
        const redisPub = app.redisPub
        if (redisPub) {
          await redisPub.publish(
            CHAT_PUBSUB_CHANNELS.CONVERSATION_UPDATE,
            JSON.stringify({
              tenantId,
              conversationId,
              status: initialStatus,
              isNew: true,
            })
          )
        }
      }
      const visitorToken = signVisitorToken({
        conversationId,
        contactId,
        channelId,
        tenantId,
      })
      const statusCode = isNew ? 201 : 200
      return reply.status(statusCode).send({
        success: true,
        data: { conversationId, visitorToken },
      })
    }
  )
}
