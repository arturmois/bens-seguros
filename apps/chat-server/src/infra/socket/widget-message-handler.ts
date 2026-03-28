import { Conversation, Message } from '@repo/db-chat'
import { CHAT_PUBSUB_CHANNELS, CHAT_QUEUES, SOCKET_EVENTS } from '@repo/shared'
import type IORedis from 'ioredis'
import type { Server, Socket } from 'socket.io'
import { container } from 'tsyringe'

import type { QueueProducer } from '../../application/send-message.js'
import type { AppLogger } from '../logger.js'
import { isWidgetMessageAllowed } from './widget-rate-limiter.js'
import {
  parseWidgetSendMessage,
  type VisitorTokenPayload,
} from './widget-socket-types.js'

export { getVisitorData, visitorTokenSchema } from './widget-socket-types.js'
export type { VisitorTokenPayload } from './widget-socket-types.js'

export function registerWidgetMessageEvents(
  socket: Socket,
  visitor: VisitorTokenPayload,
  logger: AppLogger,
  redisPub: IORedis
): void {
  socket.on(
    SOCKET_EVENTS.WIDGET_SEND_MESSAGE,
    async (data: unknown, ack?: unknown) => {
      const rateLimitKey = `${visitor.conversationId}:${visitor.contactId}`
      if (!isWidgetMessageAllowed(rateLimitKey)) {
        logger.warn(
          { conversationId: visitor.conversationId },
          'Widget message rate limit exceeded'
        )
        if (typeof ack === 'function') {
          ack({
            success: false,
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Muitas mensagens. Aguarde um momento.',
            },
          })
        }
        return
      }

      try {
        await handleWidgetMessage(visitor, data, ack, logger, redisPub)
      } catch (err: unknown) {
        logger.error({ err }, 'Widget: failed to send message')
        if (typeof ack === 'function') {
          ack({
            success: false,
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Erro interno do servidor',
            },
          })
        }
      }
    }
  )
}

async function handleWidgetMessage(
  visitor: VisitorTokenPayload,
  data: unknown,
  ack: unknown,
  logger: AppLogger,
  redisPub: IORedis
): Promise<void> {
  const msgData = parseWidgetSendMessage(data)
  if (!msgData) {
    if (typeof ack === 'function') {
      ack({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Mensagem inválida (1-4096 caracteres)',
        },
      })
    }
    return
  }

  const conversation = await Conversation.findOne({
    _id: visitor.conversationId,
    tenantId: visitor.tenantId,
  })
    .lean()
    .exec()

  if (!conversation) {
    if (typeof ack === 'function') {
      ack({
        success: false,
        error: {
          code: 'CONVERSATION_NOT_FOUND',
          message: 'Conversa não encontrada',
        },
      })
    }
    return
  }

  if (conversation.status === 'CLOSED') {
    if (typeof ack === 'function') {
      ack({
        success: false,
        error: {
          code: 'CONVERSATION_CLOSED',
          message: 'Esta conversa já foi encerrada',
        },
      })
    }
    return
  }

  const now = new Date()

  const message = await Message.create({
    conversationId: visitor.conversationId,
    tenantId: visitor.tenantId,
    senderType: 'CLIENT',
    senderName: null,
    senderId: visitor.contactId,
    text: msgData.text,
    type: 'TEXT',
    status: 'DELIVERED',
  })

  await Conversation.updateOne(
    { _id: visitor.conversationId, tenantId: visitor.tenantId },
    { $set: { lastMessageText: msgData.text, lastMessageAt: now } }
  )

  const messagePayload = JSON.stringify({
    tenantId: visitor.tenantId,
    conversationId: visitor.conversationId,
    id: String(message._id),
    senderType: 'CLIENT',
    senderName: null,
    senderId: visitor.contactId,
    text: msgData.text,
    type: 'TEXT',
    status: 'DELIVERED',
    createdAt: message.createdAt?.toISOString() ?? now.toISOString(),
  })

  await redisPub.publish(CHAT_PUBSUB_CHANNELS.INCOMING_MESSAGE, messagePayload)
  await redisPub.publish(
    CHAT_PUBSUB_CHANNELS.UNREAD_UPDATE,
    JSON.stringify({
      tenantId: visitor.tenantId,
      conversationId: visitor.conversationId,
      userId: null,
    })
  )

  if (conversation.status === 'BOT_ACTIVE') {
    try {
      const queueProducer = container.resolve<QueueProducer>('QueueProducer')
      await queueProducer.enqueue(CHAT_QUEUES.AI_BOT, {
        conversationId: visitor.conversationId,
        tenantId: visitor.tenantId,
        messageId: String(message._id),
      })
    } catch (queueErr: unknown) {
      logger.error(
        { err: queueErr },
        'Failed to enqueue AI bot job from widget'
      )
    }
  }

  if (typeof ack === 'function') {
    ack({ success: true, data: { id: String(message._id) } })
  }
}

export function registerWidgetTypingEvents(
  socket: Socket,
  visitor: VisitorTokenPayload,
  io: Server,
  logger: AppLogger
): void {
  socket.on(SOCKET_EVENTS.WIDGET_TYPING_START, () => {
    const operatorConvRoom = `tenant:${visitor.tenantId}:conversation:${visitor.conversationId}`
    io.to(operatorConvRoom).emit(SOCKET_EVENTS.TYPING, {
      conversationId: visitor.conversationId,
      userId: visitor.contactId,
      name: 'Visitante',
    })

    logger.debug(
      { conversationId: visitor.conversationId },
      'Widget visitor typing'
    )
  })
}
