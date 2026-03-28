import { Conversation, Message } from '@repo/db-chat'
import { CHAT_PUBSUB_CHANNELS, CHAT_QUEUES } from '@repo/shared'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { container } from 'tsyringe'
import { z } from 'zod'

import type { QueueProducer } from '../../../application/send-message.js'
import { widgetAuthMiddleware } from '../middleware/widget-auth.js'

const conversationIdParamSchema = z.object({
  id: z.string().min(1),
})

const sendMessageBodySchema = z.object({
  text: z.string().min(1).max(4096),
})

export async function widgetSendMessageRoute(
  app: FastifyInstance
): Promise<void> {
  app.post(
    '/conversations/:id/messages',
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

      const bodyParsed = sendMessageBodySchema.safeParse(request.body)
      if (!bodyParsed.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Mensagem inválida (1-4096 caracteres)',
          },
        })
      }

      const { text } = bodyParsed.data

      const conversation = await Conversation.findOne({
        _id: id,
        tenantId: visitor.tenantId,
      })
        .lean()
        .exec()

      if (!conversation) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'CONVERSATION_NOT_FOUND',
            message: 'Conversa não encontrada',
          },
        })
      }

      if (conversation.status === 'CLOSED') {
        return reply.status(422).send({
          success: false,
          error: {
            code: 'CONVERSATION_CLOSED',
            message: 'Esta conversa já foi encerrada',
          },
        })
      }

      const now = new Date()

      const message = await Message.create({
        conversationId: id,
        tenantId: visitor.tenantId,
        senderType: 'CLIENT',
        senderName: null,
        senderId: visitor.contactId,
        text,
        type: 'TEXT',
        status: 'DELIVERED',
      })

      await Conversation.updateOne(
        { _id: id, tenantId: visitor.tenantId },
        { $set: { lastMessageText: text, lastMessageAt: now } }
      )

      const redisPub = app.redisPub
      if (redisPub) {
        const messagePayload = JSON.stringify({
          tenantId: visitor.tenantId,
          conversationId: id,
          id: String(message._id),
          senderType: 'CLIENT',
          senderName: null,
          senderId: visitor.contactId,
          text,
          type: 'TEXT',
          status: 'DELIVERED',
          createdAt: message.createdAt?.toISOString() ?? now.toISOString(),
        })

        await redisPub.publish(
          CHAT_PUBSUB_CHANNELS.INCOMING_MESSAGE,
          messagePayload
        )

        await redisPub.publish(
          CHAT_PUBSUB_CHANNELS.UNREAD_UPDATE,
          JSON.stringify({
            tenantId: visitor.tenantId,
            conversationId: id,
            userId: null,
          })
        )
      }

      if (conversation.status === 'BOT_ACTIVE') {
        const queueProducer = container.resolve<QueueProducer>('QueueProducer')
        await queueProducer.enqueue(CHAT_QUEUES.AI_BOT, {
          conversationId: id,
          tenantId: visitor.tenantId,
          messageId: String(message._id),
        })
      }

      return reply.status(201).send({
        success: true,
        data: { id: String(message._id) },
      })
    }
  )
}
