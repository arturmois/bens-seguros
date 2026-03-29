import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { container } from 'tsyringe'
import { z } from 'zod'

import { Channel, AiAgent } from '@repo/db-chat'
import { env } from '@repo/env'
import { CHAT_QUEUES } from '@repo/shared'
import { ChannelNotFoundError } from '../../../domain/errors.js'
import type { QueueProducer } from '../../queue/queue-producer.js'

const channelIdSchema = z.object({ id: z.string().min(1) })

const createChannelBodySchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(['WHATSAPP', 'WEB_CHAT', 'MESSENGER', 'INSTAGRAM']),
  brokerType: z.enum(['BAILEYS', 'META', 'WEB_CHAT', 'MESSENGER', 'INSTAGRAM']),
  phoneNumber: z.string().optional(),
  config: z.record(z.unknown()).optional(),
})

const updateChannelBodySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  phoneNumber: z.string().optional(),
  isActive: z.boolean().optional(),
  aiUserId: z.string().optional(),
  aiAgentId: z.string().min(1).nullable().optional(),
  config: z.record(z.unknown()).optional(),
})

const pairChannelBodySchema = z.object({
  phoneNumber: z
    .string()
    .min(10)
    .max(20)
    .regex(/^\+?\d+$/, 'Formato E.164 esperado (ex: +5511999998888)'),
})

const validateMetaBodySchema = z.object({
  pageId: z.string().min(1),
  token: z.string().min(1),
  channelType: z.enum(['INSTAGRAM', 'MESSENGER', 'WHATSAPP_META']),
  metaAppId: z.string().min(1).optional(),
  metaAppSecret: z.string().min(1).optional(),
})

const META_GRAPH_API = 'https://graph.facebook.com/v21.0'

async function validateMetaCredentials(
  pageId: string,
  token: string,
  channelType: 'INSTAGRAM' | 'MESSENGER' | 'WHATSAPP_META'
): Promise<
  | { valid: true; name: string; username?: string }
  | { valid: false; error: string }
> {
  try {
    if (channelType === 'MESSENGER') {
      const url = `${META_GRAPH_API}/${pageId}/conversations?access_token=${token}&limit=1`
      const response = await fetch(url)
      const data = (await response.json()) as Record<string, unknown>

      if (!response.ok || data['error']) {
        const err = data['error'] as Record<string, unknown> | undefined
        const message =
          typeof err?.['message'] === 'string'
            ? err['message']
            : 'Token ou Page ID inválido'
        return { valid: false, error: message }
      }

      return { valid: true, name: `Page ${pageId}` }
    }

    const fields = 'id,name,username'
    const url = `${META_GRAPH_API}/${pageId}?fields=${fields}&access_token=${token}`
    const response = await fetch(url)
    const data = (await response.json()) as Record<string, unknown>

    if (!response.ok || data['error']) {
      const err = data['error'] as Record<string, unknown> | undefined
      const message =
        typeof err?.['message'] === 'string'
          ? err['message']
          : 'Token ou Page ID inválido'
      return { valid: false, error: message }
    }

    return {
      valid: true,
      name:
        typeof data['name'] === 'string' ? data['name'] : String(data['id']),
      username:
        typeof data['username'] === 'string' ? data['username'] : undefined,
    }
  } catch {
    return { valid: false, error: 'Falha ao conectar com a API do Meta' }
  }
}

interface WebhookSetupResult {
  appSubscription: string
  pageSubscription: string
}

async function registerAppWebhookSubscription(
  metaAppId: string,
  metaAppSecret: string
): Promise<{ success: boolean; error?: string }> {
  const verifyToken = env.META_WEBHOOK_VERIFY_TOKEN
  if (!verifyToken) {
    return { success: false, error: 'META_WEBHOOK_VERIFY_TOKEN not configured' }
  }

  const callbackUrl =
    env.CHAT_WEBHOOK_PUBLIC_URL ?? `${env.CHAT_SERVER_URL}/chat/webhook/meta`

  try {
    const response = await fetch(
      `${META_GRAPH_API}/${metaAppId}/subscriptions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          object: 'page',
          callback_url: callbackUrl,
          verify_token: verifyToken,
          fields: 'messages,messaging_postbacks',
          access_token: `${metaAppId}|${metaAppSecret}`,
        }),
      }
    )

    const data = (await response.json()) as Record<string, unknown>

    if (!response.ok) {
      const err = data['error'] as Record<string, unknown> | undefined
      const message =
        typeof err?.['message'] === 'string'
          ? err['message']
          : 'Failed to register app webhook subscription'
      return { success: false, error: message }
    }

    return { success: true }
  } catch {
    return {
      success: false,
      error: 'Failed to connect to Meta API for webhook registration',
    }
  }
}

async function subscribePageToWebhooks(
  metaPageId: string,
  metaToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `${META_GRAPH_API}/${metaPageId}/subscribed_apps`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscribed_fields: 'messages,messaging_postbacks',
          access_token: metaToken,
        }),
      }
    )

    const data = (await response.json()) as Record<string, unknown>

    if (!response.ok) {
      const err = data['error'] as Record<string, unknown> | undefined
      const message =
        typeof err?.['message'] === 'string'
          ? err['message']
          : 'Failed to subscribe page to webhooks'
      return { success: false, error: message }
    }

    return { success: true }
  } catch {
    return {
      success: false,
      error: 'Failed to connect to Meta API for page subscription',
    }
  }
}

async function autoRegisterWebhook(
  channelType: string,
  config: Record<string, unknown>
): Promise<WebhookSetupResult> {
  const metaAppId =
    typeof config['metaAppId'] === 'string' ? config['metaAppId'] : undefined
  const metaAppSecret =
    typeof config['metaAppSecret'] === 'string'
      ? config['metaAppSecret']
      : undefined
  const metaPageId =
    typeof config['metaPageId'] === 'string' ? config['metaPageId'] : undefined
  const metaToken =
    typeof config['metaToken'] === 'string' ? config['metaToken'] : undefined

  if (!metaAppId || !metaAppSecret) {
    return {
      appSubscription: 'skipped: missing appId or appSecret',
      pageSubscription: 'skipped',
    }
  }

  const appResult = await registerAppWebhookSubscription(
    metaAppId,
    metaAppSecret
  )
  const appSubscription = appResult.success
    ? 'registered'
    : `failed: ${appResult.error}`

  let pageSubscription = 'skipped'
  if (channelType === 'MESSENGER' && metaPageId && metaToken) {
    const pageResult = await subscribePageToWebhooks(metaPageId, metaToken)
    pageSubscription = pageResult.success
      ? 'subscribed'
      : `failed: ${pageResult.error}`
  }

  return { appSubscription, pageSubscription }
}

function buildChannelNotFoundResponse(id: string): {
  success: false
  error: { code: string; message: string }
} {
  const err = new ChannelNotFoundError(id)
  return { success: false, error: { code: err.code, message: err.message } }
}

function mapChannel(doc: Record<string, unknown>): Record<string, unknown> {
  const { _id, ...rest } = doc
  delete rest['__v']
  return { id: String(_id), ...rest }
}

export async function channelRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/chat/channels',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.organizationId

      const docs = await Channel.find({ tenantId, isActive: { $ne: false } })
        .sort({ createdAt: -1 })
        .lean()
      const channels = docs.map((doc) =>
        mapChannel(doc as unknown as Record<string, unknown>)
      )

      return reply.send({ success: true, data: channels })
    }
  )

  app.post(
    '/chat/channels',
    async (
      request: FastifyRequest<{
        Body: z.infer<typeof createChannelBodySchema>
      }>,
      reply: FastifyReply
    ) => {
      const body = createChannelBodySchema.parse(request.body)
      const tenantId = request.organizationId

      if (body.type === 'INSTAGRAM' || body.type === 'MESSENGER') {
        const cfg = body.config as Record<string, string> | undefined
        const pageId = cfg?.metaPageId
        const token = cfg?.metaToken

        if (pageId && token) {
          const validation = await validateMetaCredentials(
            pageId,
            token,
            body.type
          )
          if (!validation.valid) {
            return reply.status(422).send({
              success: false,
              error: {
                code: 'INVALID_META_CREDENTIALS',
                message: validation.error,
              },
            })
          }
        }
      }

      const isWebChat = body.type === 'WEB_CHAT'
      const brokerType = isWebChat ? 'WEB_CHAT' : body.brokerType

      const channel = await Channel.create({
        tenantId,
        name: body.name,
        type: body.type,
        brokerType,
        phoneNumber: body.phoneNumber ?? null,
        ...(isWebChat ? { status: 'CONNECTED' } : {}),
        ...(body.config ? { config: body.config } : {}),
      })

      const isMetaChannel =
        body.type === 'MESSENGER' ||
        body.type === 'INSTAGRAM' ||
        (body.type === 'WHATSAPP' && body.brokerType === 'META')

      let webhookSetup: WebhookSetupResult | undefined
      if (isMetaChannel && body.config) {
        webhookSetup = await autoRegisterWebhook(body.type, body.config)
      }

      return reply.status(201).send({
        success: true,
        data: mapChannel(
          channel.toObject() as unknown as Record<string, unknown>
        ),
        ...(webhookSetup ? { meta: { webhookSetup } } : {}),
      })
    }
  )

  app.put(
    '/chat/channels/:id',
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof channelIdSchema>
        Body: z.infer<typeof updateChannelBodySchema>
      }>,
      reply: FastifyReply
    ) => {
      const { id } = channelIdSchema.parse(request.params)
      const body = updateChannelBodySchema.parse(request.body)
      const tenantId = request.organizationId

      if (body.config) {
        const cfg = body.config as Record<string, string>
        const existingChannel = await Channel.findOne({ _id: id, tenantId })
          .lean()
          .exec()

        if (
          existingChannel &&
          (existingChannel.type === 'INSTAGRAM' ||
            existingChannel.type === 'MESSENGER')
        ) {
          const pageId = cfg.metaPageId
          const token = cfg.metaToken
          if (pageId && token) {
            const validation = await validateMetaCredentials(
              pageId,
              token,
              existingChannel.type as 'INSTAGRAM' | 'MESSENGER'
            )
            if (!validation.valid) {
              return reply.status(422).send({
                success: false,
                error: {
                  code: 'INVALID_META_CREDENTIALS',
                  message: validation.error,
                },
              })
            }
          }
        }
      }

      if (body.aiAgentId) {
        const agent = await AiAgent.findOne({ _id: body.aiAgentId, tenantId })
          .lean()
          .exec()
        if (!agent) {
          return reply.status(404).send({
            success: false,
            error: {
              code: 'AI_AGENT_NOT_FOUND',
              message: 'Agente de IA não encontrado',
            },
          })
        }
      }

      const channel = await Channel.findOneAndUpdate(
        { _id: id, tenantId },
        { $set: body },
        { new: true }
      ).lean()

      if (!channel) {
        return reply.status(404).send(buildChannelNotFoundResponse(id))
      }

      if (body.config && channel) {
        const chType = String(channel.type)
        const isMetaChannel =
          chType === 'MESSENGER' ||
          chType === 'INSTAGRAM' ||
          (chType === 'WHATSAPP' && String(channel.brokerType) === 'META')

        if (isMetaChannel) {
          const mergedConfig = {
            ...(channel.config as Record<string, unknown> | undefined),
            ...body.config,
          }
          const webhookSetup = await autoRegisterWebhook(chType, mergedConfig)

          return reply.send({
            success: true,
            data: mapChannel(channel as unknown as Record<string, unknown>),
            meta: { webhookSetup },
          })
        }
      }

      return reply.send({
        success: true,
        data: mapChannel(channel as unknown as Record<string, unknown>),
      })
    }
  )

  app.post(
    '/chat/channels/validate-meta',
    async (
      request: FastifyRequest<{
        Body: z.infer<typeof validateMetaBodySchema>
      }>,
      reply: FastifyReply
    ) => {
      const { pageId, token, channelType, metaAppId, metaAppSecret } =
        validateMetaBodySchema.parse(request.body)

      const result = await validateMetaCredentials(pageId, token, channelType)

      if (!result.valid) {
        return reply.status(422).send({
          success: false,
          error: {
            code: 'INVALID_META_CREDENTIALS',
            message: result.error,
          },
        })
      }

      if (metaAppId && metaAppSecret) {
        try {
          const appUrl = `${META_GRAPH_API}/${metaAppId}`
          const appResponse = await fetch(appUrl, {
            headers: {
              Authorization: `Bearer ${metaAppId}|${metaAppSecret}`,
            },
          })

          if (!appResponse.ok) {
            return reply.status(422).send({
              success: false,
              error: {
                code: 'INVALID_APP_CREDENTIALS',
                message: 'App ID ou App Secret inválido',
              },
            })
          }
        } catch {
          return reply.status(422).send({
            success: false,
            error: {
              code: 'INVALID_APP_CREDENTIALS',
              message: 'Falha ao validar credenciais do App',
            },
          })
        }
      }

      return reply.send({
        success: true,
        data: { name: result.name, username: result.username },
      })
    }
  )

  app.delete(
    '/chat/channels/:id',
    async (
      request: FastifyRequest<{ Params: z.infer<typeof channelIdSchema> }>,
      reply: FastifyReply
    ) => {
      const { id } = channelIdSchema.parse(request.params)
      const tenantId = request.organizationId

      const channel = await Channel.findOneAndUpdate(
        { _id: id, tenantId },
        { $set: { isActive: false } },
        { new: true }
      ).lean()

      if (!channel) {
        return reply.status(404).send(buildChannelNotFoundResponse(id))
      }

      if (channel.brokerType === 'BAILEYS') {
        const queueProducer = container.resolve<QueueProducer>('QueueProducer')
        await queueProducer.enqueue(CHAT_QUEUES.DISCONNECT_CHANNEL, {
          channelId: id,
          tenantId,
        })
      }

      return reply.send({
        success: true,
        data: mapChannel(channel as unknown as Record<string, unknown>),
      })
    }
  )

  app.post(
    '/chat/channels/:id/connect',
    async (
      request: FastifyRequest<{ Params: z.infer<typeof channelIdSchema> }>,
      reply: FastifyReply
    ) => {
      const { id } = channelIdSchema.parse(request.params)
      const tenantId = request.organizationId

      const channel = await Channel.findOne({ _id: id, tenantId }).lean().exec()

      if (!channel) {
        return reply.status(404).send(buildChannelNotFoundResponse(id))
      }

      if (channel.brokerType !== 'BAILEYS') {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_BROKER_TYPE',
            message: 'Somente canais Baileys suportam conexão via QR Code',
          },
        })
      }

      const queueProducer = container.resolve<QueueProducer>('QueueProducer')
      await queueProducer.enqueue(CHAT_QUEUES.CONNECT_CHANNEL, {
        channelId: id,
        tenantId,
      })

      return reply.send({ success: true, data: { status: 'connecting' } })
    }
  )

  app.post(
    '/chat/channels/:id/pair',
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof channelIdSchema>
        Body: z.infer<typeof pairChannelBodySchema>
      }>,
      reply: FastifyReply
    ) => {
      const { id } = channelIdSchema.parse(request.params)
      const { phoneNumber } = pairChannelBodySchema.parse(request.body)
      const tenantId = request.organizationId

      const channel = await Channel.findOne({ _id: id, tenantId }).lean().exec()

      if (!channel) {
        return reply.status(404).send(buildChannelNotFoundResponse(id))
      }

      if (channel.brokerType !== 'BAILEYS') {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_BROKER_TYPE',
            message: 'Somente canais Baileys suportam pareamento por código',
          },
        })
      }

      const queueProducer = container.resolve<QueueProducer>('QueueProducer')
      await queueProducer.enqueue(CHAT_QUEUES.PAIR_CHANNEL, {
        channelId: id,
        tenantId,
        phoneNumber,
      })

      return reply.send({ success: true, data: { status: 'pairing' } })
    }
  )
}
