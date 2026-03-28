import { Channel, Contact, Conversation, Message } from '@repo/db-chat'
import {
  CHAT_LIMITS,
  CHAT_PUBSUB_CHANNELS,
  CHAT_QUEUES,
  isRecord,
} from '@repo/shared'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import mongoose from 'mongoose'
import { container } from 'tsyringe'
import { z } from 'zod'

import type { QueueProducer } from '../../../application/send-message.js'
import {
  signVisitorToken,
  widgetAuthMiddleware,
} from '../middleware/widget-auth.js'

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const channelIdParamSchema = z.object({
  channelId: z.string().min(1),
})

const conversationIdParamSchema = z.object({
  id: z.string().min(1),
})

const BR_PHONE_REGEX = /^\+?55\d{10,11}$/

const createConversationBodySchema = z.object({
  channelId: z.string().min(1),
  name: z.string().min(2).max(100),
  phone: z.string().regex(BR_PHONE_REGEX, 'Telefone brasileiro inválido'),
  email: z.string().email('E-mail inválido').optional(),
})

const sendMessageBodySchema = z.object({
  text: z.string().min(1).max(4096),
})

const messagesQuerySchema = z.object({
  before: z.string().optional(),
})

// ---------------------------------------------------------------------------
// Rate limiter (simple IP-based, in-memory)
// ---------------------------------------------------------------------------

interface RateBucket {
  count: number
  resetAt: number
}

const ipBuckets = new Map<string, RateBucket>()

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = CHAT_LIMITS.WIDGET_RATE_LIMIT_PER_MIN

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const bucket = ipBuckets.get(ip)

  if (!bucket || now >= bucket.resetAt) {
    ipBuckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  bucket.count += 1
  return bucket.count > RATE_LIMIT_MAX
}

// Periodic cleanup to prevent memory leak
const cleanupInterval = setInterval(() => {
  const now = Date.now()
  for (const [ip, bucket] of ipBuckets) {
    if (now >= bucket.resetAt) {
      ipBuckets.delete(ip)
    }
  }
}, RATE_LIMIT_WINDOW_MS)

// Allow Node to exit even if the interval is still running
cleanupInterval.unref()

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_WIDGET_COLOR = '#1f4b5f'
const DEFAULT_WELCOME_MESSAGE = 'Olá! Como podemos ajudar?'
const MESSAGES_PER_PAGE = CHAT_LIMITS.MESSAGES_PER_PAGE

function getClientIp(request: FastifyRequest): string {
  const forwarded = request.headers['x-forwarded-for']
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0]?.trim() ?? request.ip
  }
  return request.ip
}

function getChannelConfig(config: unknown): {
  widgetColor: string
  welcomeMessage: string
  allowedOrigins: string[]
} {
  if (!isRecord(config)) {
    return {
      widgetColor: DEFAULT_WIDGET_COLOR,
      welcomeMessage: DEFAULT_WELCOME_MESSAGE,
      allowedOrigins: [],
    }
  }

  const widgetColor =
    typeof config['widgetColor'] === 'string'
      ? config['widgetColor']
      : DEFAULT_WIDGET_COLOR

  const welcomeMessage =
    typeof config['welcomeMessage'] === 'string'
      ? config['welcomeMessage']
      : DEFAULT_WELCOME_MESSAGE

  const rawOrigins = config['allowedOrigins']
  const allowedOrigins = Array.isArray(rawOrigins)
    ? rawOrigins.filter((o): o is string => typeof o === 'string')
    : []

  return { widgetColor, welcomeMessage, allowedOrigins }
}

function isValidOrigin(
  allowedOrigins: readonly string[],
  requestOrigin: string | undefined
): boolean {
  if (allowedOrigins.length === 0) return true
  if (!requestOrigin) return false
  return allowedOrigins.some((origin) => requestOrigin.startsWith(origin))
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export async function widgetRoutes(app: FastifyInstance): Promise<void> {
  // Rate limit hook for all /widget/* routes
  app.addHook(
    'onRequest',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const ip = getClientIp(request)
      if (isRateLimited(ip)) {
        await reply.status(429).send({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Muitas requisições. Tente novamente em alguns instantes.',
          },
        })
      }
    }
  )

  // -------------------------------------------------------------------
  // PUBLIC: GET /widget/config/:channelId
  // -------------------------------------------------------------------
  app.get(
    '/config/:channelId',
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof channelIdParamSchema>
      }>,
      reply: FastifyReply
    ) => {
      const params = channelIdParamSchema.safeParse(request.params)
      if (!params.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_PARAMS', message: 'channelId inválido' },
        })
      }

      const { channelId } = params.data

      if (!mongoose.Types.ObjectId.isValid(channelId)) {
        return reply.status(404).send({
          success: false,
          error: { code: 'CHANNEL_NOT_FOUND', message: 'Canal não encontrado' },
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
          error: { code: 'CHANNEL_NOT_FOUND', message: 'Canal não encontrado' },
        })
      }

      const { widgetColor, welcomeMessage } = getChannelConfig(channel.config)

      return reply.send({
        success: true,
        data: {
          channelId: String(channel._id),
          name: channel.name,
          widgetColor,
          welcomeMessage,
        },
      })
    }
  )

  // -------------------------------------------------------------------
  // PUBLIC: POST /widget/conversations
  // -------------------------------------------------------------------
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

      if (!mongoose.Types.ObjectId.isValid(channelId)) {
        return reply.status(404).send({
          success: false,
          error: { code: 'CHANNEL_NOT_FOUND', message: 'Canal não encontrado' },
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
          error: { code: 'CHANNEL_NOT_FOUND', message: 'Canal não encontrado' },
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

      // Upsert contact by phone
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

      // Find existing open conversation or create new
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

        // Create welcome system message
        await Message.create({
          conversationId,
          tenantId,
          senderType: 'SYSTEM',
          text: welcomeMessage,
          type: 'TEXT',
          status: 'DELIVERED',
        })

        // Publish CONVERSATION_UPDATE via Redis
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

      // Sign visitor token
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

  // -------------------------------------------------------------------
  // PROTECTED: POST /widget/conversations/:id/messages
  // -------------------------------------------------------------------
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

      // Verify conversation is not closed
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

      // Create message
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

      // Update conversation last message
      await Conversation.updateOne(
        { _id: id, tenantId: visitor.tenantId },
        { $set: { lastMessageText: text, lastMessageAt: now } }
      )

      // Publish via Redis
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

      // If BOT_ACTIVE, enqueue AI bot job
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

  // -------------------------------------------------------------------
  // PROTECTED: GET /widget/conversations/:id
  // -------------------------------------------------------------------
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

      // Build filter
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

      // Reverse to ascending order for display
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
