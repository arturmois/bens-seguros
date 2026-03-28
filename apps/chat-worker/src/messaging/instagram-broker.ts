import pino from 'pino'
import { z } from 'zod'

import type {
  Broker,
  BrokerEvents,
  MessagePayload,
  MessageResult,
} from './broker.js'

const META_API_BASE = 'https://graph.facebook.com/v21.0'

interface InstagramConfig {
  readonly metaPageId: string
  readonly metaToken: string
}

const instagramSendResponseSchema = z.object({
  message_id: z.string().optional(),
  error: z.object({ message: z.string(), code: z.number() }).optional(),
})

const SUPPORTED_MEDIA_TYPES = new Set(['IMAGE'])

function parseConfig(config: Record<string, unknown>): InstagramConfig {
  const metaPageId = config['metaPageId']
  const metaToken = config['metaToken']

  if (typeof metaPageId !== 'string' || metaPageId.length === 0) {
    throw new Error('InstagramBroker: metaPageId is required in channel config')
  }

  if (typeof metaToken !== 'string' || metaToken.length === 0) {
    throw new Error('InstagramBroker: metaToken is required in channel config')
  }

  return { metaPageId, metaToken }
}

export class InstagramBroker implements Broker {
  private readonly config: InstagramConfig
  private readonly logger = pino({ level: 'info' }).child({
    broker: 'instagram',
  })

  constructor(rawConfig: Record<string, unknown>) {
    this.config = parseConfig(rawConfig)
  }

  async connect(_events: BrokerEvents): Promise<void> {
    this.logger.info('InstagramBroker connected (stateless, no-op)')
  }

  async disconnect(): Promise<void> {
    this.logger.info('InstagramBroker disconnected (stateless, no-op)')
  }

  isConnected(): boolean {
    return true
  }

  async sendMessage(payload: MessagePayload): Promise<MessageResult> {
    const url = `${META_API_BASE}/${this.config.metaPageId}/messages`
    const body = this.buildRequestBody(payload)

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.metaToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const json: unknown = await response.json()
      const parsed = instagramSendResponseSchema.safeParse(json)
      const data = parsed.success
        ? parsed.data
        : { message_id: undefined, error: undefined }

      if (!response.ok || data.error) {
        const errorCode =
          data.error?.message ?? `HTTP_${String(response.status)}`
        this.logger.warn(
          { errorCode, recipientId: payload.to },
          'Instagram send failed'
        )
        return { externalId: '', status: 'FAILED', errorCode }
      }

      const externalId = data.message_id ?? ''
      return { externalId, status: 'SENT' }
    } catch (err: unknown) {
      const errorCode =
        err instanceof Error ? err.message : 'UNKNOWN_INSTAGRAM_ERROR'
      this.logger.error(
        { err, recipientId: payload.to },
        'Instagram send exception'
      )
      return { externalId: '', status: 'FAILED', errorCode }
    }
  }

  private buildRequestBody(payload: MessagePayload): Record<string, unknown> {
    const recipient = { id: payload.to }

    if (payload.type === 'TEXT') {
      return {
        recipient,
        message: { text: payload.text ?? '' },
      }
    }

    if (!SUPPORTED_MEDIA_TYPES.has(payload.type)) {
      this.logger.warn(
        { type: payload.type, recipientId: payload.to },
        'Instagram does not support this media type, falling back to text'
      )
      return {
        recipient,
        message: { text: payload.text ?? '[Unsupported media type]' },
      }
    }

    return {
      recipient,
      message: {
        attachment: {
          type: 'image',
          payload: {
            url: payload.mediaUrl ?? '',
            is_reusable: true,
          },
        },
      },
    }
  }
}
