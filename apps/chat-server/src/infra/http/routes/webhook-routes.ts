import { Channel } from '@repo/db-chat'
import { env } from '@repo/env'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { container } from 'tsyringe'
import { z } from 'zod'

import { CHAT_QUEUES } from '@repo/shared'
import type { QueueProducer } from '../../../application/send-message.js'

const metaVerificationQuerySchema = z.object({
  'hub.mode': z.string(),
  'hub.verify_token': z.string(),
  'hub.challenge': z.string(),
})

const metaWebhookEntrySchema = z.object({
  id: z.string(),
  changes: z
    .array(
      z.object({
        value: z.unknown(),
        field: z.string(),
      })
    )
    .optional(),
  messaging: z
    .array(
      z.object({
        sender: z.object({ id: z.string() }),
        recipient: z.object({ id: z.string() }),
        timestamp: z.number(),
        message: z
          .object({
            mid: z.string(),
            text: z.string().optional(),
            attachments: z
              .array(
                z.object({
                  type: z.string(),
                  payload: z.object({ url: z.string().optional() }).optional(),
                })
              )
              .optional(),
          })
          .optional(),
      })
    )
    .optional(),
})

const metaWebhookPayloadSchema = z.object({
  object: z.string(),
  entry: z.array(metaWebhookEntrySchema),
})

interface RawBodyRequest extends FastifyRequest {
  rawBodyBuffer?: Buffer
}

function getVerifyToken(): string {
  const token = env.META_WEBHOOK_VERIFY_TOKEN
  if (!token) {
    throw new Error('META_WEBHOOK_VERIFY_TOKEN is not configured')
  }
  return token
}

function validateHmacSignature(
  rawBody: Buffer,
  signatureHeader: string,
  appSecret: string
): boolean {
  const expectedSignature = `sha256=${createHmac('sha256', appSecret).update(rawBody).digest('hex')}`

  const expectedBuffer = Buffer.from(expectedSignature, 'utf8')
  const receivedBuffer = Buffer.from(signatureHeader, 'utf8')

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false
  }

  return timingSafeEqual(expectedBuffer, receivedBuffer)
}

async function findChannelByAccountId(
  accountId: string,
  objectType: string,
  requireAppSecret: boolean
): Promise<{ appSecret?: string; channelId: string; tenantId: string } | null> {
  const isPageOrInstagram = objectType === 'page' || objectType === 'instagram'
  const filter = isPageOrInstagram
    ? { 'config.metaPageId': accountId, isActive: true }
    : { 'config.metaPhoneNumberId': accountId, isActive: true }

  const channel = await Channel.findOne(filter).lean().exec()
  if (!channel) {
    return null
  }

  const config = channel.config as Record<string, unknown> | undefined

  if (requireAppSecret) {
    const appSecret = config?.['metaAppSecret']
    if (typeof appSecret !== 'string' || appSecret.length === 0) {
      return null
    }
    return {
      appSecret,
      channelId: String(channel._id),
      tenantId: String(channel.tenantId),
    }
  }

  return {
    channelId: String(channel._id),
    tenantId: String(channel.tenantId),
  }
}

interface WebhookAttachment {
  readonly type: string
  readonly payload?: { readonly url?: string }
}

const ATTACHMENT_TYPE_MAP: Record<string, string> = {
  image: 'IMAGE',
  audio: 'AUDIO',
  video: 'VIDEO',
  file: 'DOCUMENT',
}

function resolveAttachmentType(
  attachments: ReadonlyArray<WebhookAttachment> | undefined
): string | undefined {
  if (!attachments || attachments.length === 0) {
    return undefined
  }
  const first = attachments[0]
  return first ? (ATTACHMENT_TYPE_MAP[first.type] ?? 'OTHER') : undefined
}

function resolveAttachmentUrl(
  attachments: ReadonlyArray<WebhookAttachment> | undefined
): string | undefined {
  if (!attachments || attachments.length === 0) {
    return undefined
  }
  const first = attachments[0]
  return first?.payload?.url
}

export async function webhookRoutes(app: FastifyInstance): Promise<void> {
  // Capture raw body for HMAC verification on Meta webhook POST
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (req: FastifyRequest, body: Buffer, done) => {
      const rawReq = req as RawBodyRequest
      rawReq.rawBodyBuffer = body

      let parsed: unknown
      try {
        parsed = JSON.parse(body.toString('utf8'))
      } catch {
        done(new Error('Invalid JSON'), undefined)
        return
      }
      done(null, parsed)
    }
  )

  app.get(
    '/chat/webhook/meta',
    async (
      request: FastifyRequest<{ Querystring: Record<string, string> }>,
      reply: FastifyReply
    ) => {
      const parsed = metaVerificationQuerySchema.safeParse(request.query)

      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_QUERY',
            message: 'Missing required hub parameters',
          },
        })
      }

      const {
        'hub.mode': mode,
        'hub.verify_token': verifyToken,
        'hub.challenge': challenge,
      } = parsed.data

      if (mode !== 'subscribe') {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_MODE',
            message: 'hub.mode must be subscribe',
          },
        })
      }

      let expectedToken: string
      try {
        expectedToken = getVerifyToken()
      } catch {
        app.log.error('META_WEBHOOK_VERIFY_TOKEN is not configured')
        return reply.status(500).send({
          success: false,
          error: {
            code: 'MISCONFIGURED',
            message: 'Webhook verification not configured',
          },
        })
      }

      const tokenBuffer = Buffer.from(verifyToken, 'utf8')
      const expectedBuffer = Buffer.from(expectedToken, 'utf8')
      if (
        tokenBuffer.length !== expectedBuffer.length ||
        !timingSafeEqual(tokenBuffer, expectedBuffer)
      ) {
        return reply.status(403).send({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Invalid verify token' },
        })
      }

      return reply.status(200).send(challenge)
    }
  )

  app.post(
    '/chat/webhook/meta',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const signatureHeader = request.headers['x-hub-signature-256']

      if (typeof signatureHeader !== 'string') {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'MISSING_SIGNATURE',
            message: 'X-Hub-Signature-256 header is required',
          },
        })
      }

      const rawReq = request as RawBodyRequest
      const rawBody = rawReq.rawBodyBuffer

      if (!rawBody) {
        return reply.status(400).send({
          success: false,
          error: { code: 'MISSING_BODY', message: 'Request body is required' },
        })
      }

      // Validate HMAC with global app secret (centralized app model)
      const globalAppSecret = env.META_APP_SECRET
      if (globalAppSecret) {
        const isValid = validateHmacSignature(
          rawBody,
          signatureHeader,
          globalAppSecret
        )
        if (!isValid) {
          app.log.warn(
            { event: 'meta.webhook.hmac_failed' },
            'Meta webhook HMAC validation failed (global secret)'
          )
          return reply.status(401).send({
            success: false,
            error: {
              code: 'INVALID_SIGNATURE',
              message: 'Invalid HMAC signature',
            },
          })
        }
      }

      // Parse JSON to identify the channel for routing
      const bodyParsed = metaWebhookPayloadSchema.safeParse(request.body)

      if (!bodyParsed.success) {
        app.log.warn('Received malformed Meta webhook payload')
        return reply.status(200).send({ success: true })
      }

      const { object, entry } = bodyParsed.data
      const firstEntry = entry[0]

      if (!firstEntry) {
        return reply.status(200).send({ success: true })
      }

      // Look up channel by accountId for routing; require per-channel appSecret only when no global secret
      const requireAppSecret = !globalAppSecret
      const channelInfo = await findChannelByAccountId(
        firstEntry.id,
        object,
        requireAppSecret
      )

      if (!channelInfo) {
        app.log.warn(
          { accountId: firstEntry.id, object },
          'No active channel found for webhook accountId'
        )
        return reply.status(200).send({ success: true })
      }

      // Validate HMAC with per-channel secret when no global secret is configured (backwards compat)
      if (!globalAppSecret) {
        const perChannelSecret = channelInfo.appSecret
        if (!perChannelSecret) {
          app.log.error(
            { accountId: firstEntry.id },
            'No HMAC secret available — neither global META_APP_SECRET nor per-channel metaAppSecret configured'
          )
          return reply.status(500).send({
            success: false,
            error: {
              code: 'NO_HMAC_SECRET',
              message: 'Webhook HMAC validation not configured',
            },
          })
        }

        const isValid = validateHmacSignature(
          rawBody,
          signatureHeader,
          perChannelSecret
        )
        if (!isValid) {
          return reply.status(401).send({
            success: false,
            error: {
              code: 'INVALID_SIGNATURE',
              message: 'HMAC signature verification failed',
            },
          })
        }
      }

      const queueProducer = container.resolve<QueueProducer>('QueueProducer')

      if (object === 'page' || object === 'instagram') {
        const source = object === 'page' ? 'MESSENGER' : 'INSTAGRAM'

        for (const entryItem of entry) {
          const messagingEvents = entryItem.messaging ?? []

          for (const event of messagingEvents) {
            if (!event.message) {
              continue
            }

            const attachmentType = resolveAttachmentType(
              event.message.attachments
            )
            const attachmentUrl = resolveAttachmentUrl(
              event.message.attachments
            )

            app.log.debug(
              {
                source,
                accountId: entryItem.id,
                senderId: event.sender.id,
                mid: event.message.mid,
              },
              'Messenger/Instagram webhook message'
            )

            await queueProducer.enqueue(CHAT_QUEUES.PROCESS_INCOMING, {
              source,
              accountId: entryItem.id,
              senderId: event.sender.id,
              messageId: event.message.mid,
              text: event.message.text,
              attachmentType,
              attachmentUrl,
              timestamp: event.timestamp,
            })
          }
        }

        return reply.status(200).send({ success: true })
      }

      for (const entryItem of entry) {
        const changes = entryItem.changes ?? []

        for (const change of changes) {
          app.log.debug(
            { accountId: entryItem.id, field: change.field },
            'Meta webhook change'
          )

          await queueProducer.enqueue(CHAT_QUEUES.PROCESS_INCOMING, {
            source: 'META',
            accountId: entryItem.id,
            field: change.field,
            value: change.value,
          })
        }
      }

      return reply.status(200).send({ success: true })
    }
  )
}
