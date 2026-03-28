import { Conversation, Message } from '@repo/db-chat'
import { env } from '@repo/env'
import {
  CHAT_LIMITS,
  CHAT_PUBSUB_CHANNELS,
  CHAT_QUEUES,
  SOCKET_EVENTS,
  isRecord,
} from '@repo/shared'
import type IORedis from 'ioredis'
import jwt from 'jsonwebtoken'
import type { Namespace, Server, Socket } from 'socket.io'
import { container } from 'tsyringe'
import { z } from 'zod'

import type { QueueProducer } from '../../application/send-message.js'
import type { AppLogger } from '../logger.js'

// ---------------------------------------------------------------------------
// Visitor token validation (mirrors widget-auth.ts)
// ---------------------------------------------------------------------------

const visitorTokenSchema = z.object({
  conversationId: z.string(),
  contactId: z.string(),
  channelId: z.string(),
  tenantId: z.string(),
})

type VisitorTokenPayload = z.infer<typeof visitorTokenSchema>

// ---------------------------------------------------------------------------
// Rate limiter (per-visitor, in-memory sliding window)
// ---------------------------------------------------------------------------

const WIDGET_RATE_LIMIT_PER_SEC = CHAT_LIMITS.WIDGET_SOCKET_RATE_LIMIT_PER_SEC
const RATE_WINDOW_MS = 1_000

const visitorTimestamps = new Map<string, number[]>()

function isWidgetMessageAllowed(visitorKey: string): boolean {
  const now = Date.now()
  const windowStart = now - RATE_WINDOW_MS

  let timestamps = visitorTimestamps.get(visitorKey)
  if (!timestamps) {
    timestamps = []
    visitorTimestamps.set(visitorKey, timestamps)
  }

  // Remove timestamps outside the window
  const firstValidIndex = timestamps.findIndex((t) => t > windowStart)
  if (firstValidIndex > 0) {
    timestamps.splice(0, firstValidIndex)
  }
  if (firstValidIndex === -1) {
    timestamps.length = 0
  }

  if (timestamps.length >= WIDGET_RATE_LIMIT_PER_SEC) {
    return false
  }

  timestamps.push(now)
  return true
}

// Periodic cleanup to prevent memory leak
const cleanupInterval = setInterval(() => {
  const now = Date.now()
  for (const [key, timestamps] of visitorTimestamps) {
    const recent = timestamps.filter((t) => t > now - RATE_WINDOW_MS)
    if (recent.length === 0) {
      visitorTimestamps.delete(key)
    } else {
      visitorTimestamps.set(key, recent)
    }
  }
}, 60_000)

cleanupInterval.unref()

// ---------------------------------------------------------------------------
// Message validation
// ---------------------------------------------------------------------------

const MIN_TEXT_LENGTH = 1
const MAX_TEXT_LENGTH = 4096

interface WidgetSendMessageData {
  readonly text: string
}

function parseWidgetSendMessage(data: unknown): WidgetSendMessageData | null {
  if (!isRecord(data)) return null
  if (typeof data['text'] !== 'string') return null
  const text = data['text']
  if (text.length < MIN_TEXT_LENGTH || text.length > MAX_TEXT_LENGTH)
    return null
  return { text }
}

// ---------------------------------------------------------------------------
// Socket data helpers
// ---------------------------------------------------------------------------

function getVisitorData(socket: Socket): VisitorTokenPayload {
  const visitor: unknown = socket.data['visitor']
  if (!isRecord(visitor)) {
    throw new Error('Socket visitor data not found')
  }
  return {
    conversationId: String(visitor['conversationId']),
    contactId: String(visitor['contactId']),
    channelId: String(visitor['channelId']),
    tenantId: String(visitor['tenantId']),
  }
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

interface SetupWidgetNamespaceOptions {
  readonly io: Server
  readonly logger: AppLogger
  readonly redisSub: IORedis
  readonly redisPub: IORedis
}

export function setupWidgetNamespace(
  options: SetupWidgetNamespaceOptions
): void {
  const { io, logger, redisSub, redisPub } = options

  const widgetNs: Namespace = io.of('/widget')

  // Auth middleware: validate visitorToken JWT
  widgetNs.use((socket: Socket, next: (err?: Error) => void) => {
    const token = socket.handshake.auth['token']

    if (typeof token !== 'string') {
      logger.warn('Widget socket rejected: missing token')
      next(new Error('Token de autenticação ausente'))
      return
    }

    try {
      const decoded: unknown = jwt.verify(token, env.SOCKET_JWT_SECRET)
      const parsed = visitorTokenSchema.safeParse(decoded)

      if (!parsed.success) {
        logger.warn('Widget socket rejected: invalid token payload')
        next(new Error('Token inválido'))
        return
      }

      socket.data['visitor'] = parsed.data
      next()
    } catch {
      logger.warn('Widget socket rejected: token verification failed')
      next(new Error('Token expirado ou inválido'))
    }
  })

  // Connection handler
  widgetNs.on('connection', (socket: Socket) => {
    const visitor = getVisitorData(socket)
    const widgetRoom = `widget:${visitor.conversationId}`

    void socket.join(widgetRoom)

    logger.info(
      {
        conversationId: visitor.conversationId,
        contactId: visitor.contactId,
      },
      'Widget visitor connected'
    )

    registerWidgetMessageEvents(socket, visitor, logger, redisPub)
    registerWidgetTypingEvents(socket, visitor, io, logger)

    socket.on('disconnect', () => {
      logger.info(
        { conversationId: visitor.conversationId },
        'Widget visitor disconnected'
      )
    })
  })

  // Subscribe to Redis pub/sub for forwarding to widget rooms
  subscribeWidgetRedis(widgetNs, redisSub, logger)
}

// ---------------------------------------------------------------------------
// Message events
// ---------------------------------------------------------------------------

function registerWidgetMessageEvents(
  socket: Socket,
  visitor: VisitorTokenPayload,
  logger: AppLogger,
  redisPub: IORedis
): void {
  socket.on(
    SOCKET_EVENTS.WIDGET_SEND_MESSAGE,
    async (data: unknown, ack?: unknown) => {
      // Rate limit
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

        // Verify conversation is not closed
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

        // Create message
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

        // Update conversation last message
        await Conversation.updateOne(
          { _id: visitor.conversationId, tenantId: visitor.tenantId },
          { $set: { lastMessageText: msgData.text, lastMessageAt: now } }
        )

        // Publish INCOMING_MESSAGE via Redis (operators will pick this up)
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

        await redisPub.publish(
          CHAT_PUBSUB_CHANNELS.INCOMING_MESSAGE,
          messagePayload
        )

        // Publish UNREAD_UPDATE via Redis
        await redisPub.publish(
          CHAT_PUBSUB_CHANNELS.UNREAD_UPDATE,
          JSON.stringify({
            tenantId: visitor.tenantId,
            conversationId: visitor.conversationId,
            userId: null,
          })
        )

        // Enqueue AI bot job if conversation is BOT_ACTIVE
        if (conversation.status === 'BOT_ACTIVE') {
          try {
            const queueProducer =
              container.resolve<QueueProducer>('QueueProducer')
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

// ---------------------------------------------------------------------------
// Typing events
// ---------------------------------------------------------------------------

function registerWidgetTypingEvents(
  socket: Socket,
  visitor: VisitorTokenPayload,
  io: Server,
  logger: AppLogger
): void {
  socket.on(SOCKET_EVENTS.WIDGET_TYPING_START, () => {
    // Emit typing to operator room in the default namespace
    // (widget rooms live in /widget namespace, operator rooms live in /)
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

// ---------------------------------------------------------------------------
// Redis subscription for widget namespace
// ---------------------------------------------------------------------------

function subscribeWidgetRedis(
  widgetNs: Namespace,
  redisSub: IORedis,
  logger: AppLogger
): void {
  const channels = [
    CHAT_PUBSUB_CHANNELS.INCOMING_MESSAGE,
    CHAT_PUBSUB_CHANNELS.CONVERSATION_UPDATE,
  ]

  redisSub
    .subscribe(...channels)
    .then(() => {
      logger.info(
        { channels },
        'Widget namespace subscribed to Redis pub/sub channels'
      )
    })
    .catch((err: unknown) => {
      logger.error(
        { err },
        'Widget namespace failed to subscribe to Redis pub/sub'
      )
    })

  redisSub.on('message', (channel: string, rawMessage: string) => {
    handleWidgetRedisMessage(widgetNs, channel, rawMessage, logger)
  })
}

function handleWidgetRedisMessage(
  widgetNs: Namespace,
  channel: string,
  rawMessage: string,
  logger: AppLogger
): void {
  let payload: Record<string, unknown>
  try {
    const parsed: unknown = JSON.parse(rawMessage)
    if (!isRecord(parsed)) {
      logger.warn({ channel }, 'Widget: invalid pub/sub message format')
      return
    }
    payload = parsed
  } catch {
    logger.warn({ channel }, 'Widget: failed to parse pub/sub message')
    return
  }

  const conversationId =
    typeof payload['conversationId'] === 'string'
      ? payload['conversationId']
      : null

  if (!conversationId) return

  const widgetRoom = `widget:${conversationId}`

  switch (channel) {
    case CHAT_PUBSUB_CHANNELS.INCOMING_MESSAGE: {
      // Only forward messages NOT from CLIENT (bot/agent responses)
      const senderType =
        typeof payload['senderType'] === 'string' ? payload['senderType'] : null

      if (senderType === 'CLIENT') return

      widgetNs
        .to(widgetRoom)
        .emit(SOCKET_EVENTS.WIDGET_INCOMING_MESSAGE, payload)
      break
    }

    case CHAT_PUBSUB_CHANNELS.CONVERSATION_UPDATE: {
      widgetNs
        .to(widgetRoom)
        .emit(SOCKET_EVENTS.WIDGET_CONVERSATION_UPDATED, payload)
      break
    }

    default:
      break
  }
}
