import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { container } from 'tsyringe'
import { z } from 'zod'

import { Channel, AiAgent, type ChannelDocument } from '@repo/db-chat'
import { CHAT_QUEUES } from '@repo/shared'
import { ChannelNotFoundError } from '../../../domain/errors.js'
import type { QueueProducer } from '../../queue/queue-producer.js'
import {
  validateMetaCredentials,
  autoRegisterWebhook,
  type WebhookSetupResult,
} from './channel-meta-service.js'
import { channelWebhookRoutes } from './channel-webhook-routes.js'

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

function buildChannelNotFoundResponse(id: string): {
  success: false
  error: { code: string; message: string }
} {
  const err = new ChannelNotFoundError(id)
  return { success: false, error: { code: err.code, message: err.message } }
}

function mapChannel(doc: ChannelDocument): Record<string, unknown> {
  const { _id, ...rest } = doc
  return { id: String(_id), ...rest }
}

export async function channelRoutes(app: FastifyInstance): Promise<void> {
  await app.register(channelWebhookRoutes)

  app.get(
    '/chat/channels',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.organizationId

      const docs = await Channel.find({ tenantId, isActive: { $ne: false } })
        .sort({ createdAt: -1 })
        .lean<ChannelDocument[]>()
      const channels = docs.map(mapChannel)

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
        data: mapChannel(channel.toObject<ChannelDocument>()),
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
      ).lean<ChannelDocument>()

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
            data: mapChannel(channel),
            meta: { webhookSetup },
          })
        }
      }

      return reply.send({
        success: true,
        data: mapChannel(channel),
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
      ).lean<ChannelDocument>()

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
        data: mapChannel(channel),
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
