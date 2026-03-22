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
  changes: z.array(
    z.object({
      value: z.unknown(),
      field: z.string(),
    })
  ),
})

const metaWebhookPayloadSchema = z.object({
  object: z.string(),
  entry: z.array(metaWebhookEntrySchema),
})

interface RawBodyRequest extends FastifyRequest {
  rawBodyBuffer?: Buffer
}

function getVerifyToken(): string {
  const token = env.META_WHATSAPP_VERIFY_TOKEN
  if (!token) {
    throw new Error('META_WHATSAPP_VERIFY_TOKEN is not configured')
  }
  return token
}

function getAppSecret(): string {
  const secret = env.META_WHATSAPP_TOKEN
  if (!secret) {
    throw new Error('META_WHATSAPP_TOKEN is not configured')
  }
  return secret
}

function validateHmacSignature(
  rawBody: Buffer,
  signatureHeader: string
): boolean {
  const secret = getAppSecret()

  const expectedSignature = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`

  const expectedBuffer = Buffer.from(expectedSignature, 'utf8')
  const receivedBuffer = Buffer.from(signatureHeader, 'utf8')

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false
  }

  return timingSafeEqual(expectedBuffer, receivedBuffer)
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
        app.log.error('META_WHATSAPP_VERIFY_TOKEN is not configured')
        return reply.status(500).send({
          success: false,
          error: {
            code: 'MISCONFIGURED',
            message: 'Webhook verification not configured',
          },
        })
      }

      if (verifyToken !== expectedToken) {
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

      let isValid: boolean
      try {
        isValid = validateHmacSignature(rawBody, signatureHeader)
      } catch {
        app.log.error(
          'META_WHATSAPP_TOKEN is not configured for HMAC validation'
        )
        return reply.status(500).send({
          success: false,
          error: {
            code: 'MISCONFIGURED',
            message: 'Webhook signature validation not configured',
          },
        })
      }

      if (!isValid) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'INVALID_SIGNATURE',
            message: 'HMAC signature verification failed',
          },
        })
      }

      const bodyParsed = metaWebhookPayloadSchema.safeParse(request.body)

      if (!bodyParsed.success) {
        app.log.warn(
          { body: request.body },
          'Received malformed Meta webhook payload'
        )
        return reply.status(200).send({ success: true })
      }

      const queueProducer = container.resolve<QueueProducer>('QueueProducer')
      const { entry } = bodyParsed.data

      for (const entryItem of entry) {
        for (const change of entryItem.changes) {
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
