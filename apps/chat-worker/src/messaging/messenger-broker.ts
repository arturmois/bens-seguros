import pino from 'pino'

import type {
  Broker,
  BrokerEvents,
  MessagePayload,
  MessageResult,
} from './broker.js'

const META_API_BASE = 'https://graph.facebook.com/v21.0'

interface MessengerConfig {
  readonly metaPageId: string
  readonly metaToken: string
}

interface MessengerSendResponse {
  message_id?: string
  error?: { message: string; code: number }
}

type MessengerAttachmentType = 'image' | 'audio' | 'video' | 'file'

const MEDIA_TYPE_MAP: Record<string, MessengerAttachmentType> = {
  IMAGE: 'image',
  AUDIO: 'audio',
  VIDEO: 'video',
  DOCUMENT: 'file',
}

function parseConfig(config: Record<string, unknown>): MessengerConfig {
  const metaPageId = config['metaPageId']
  const metaToken = config['metaToken']

  if (typeof metaPageId !== 'string' || metaPageId.length === 0) {
    throw new Error('MessengerBroker: metaPageId is required in channel config')
  }

  if (typeof metaToken !== 'string' || metaToken.length === 0) {
    throw new Error('MessengerBroker: metaToken is required in channel config')
  }

  return { metaPageId, metaToken }
}

export class MessengerBroker implements Broker {
  private readonly config: MessengerConfig
  private readonly logger = pino({ level: 'info' }).child({
    broker: 'messenger',
  })

  constructor(rawConfig: Record<string, unknown>) {
    this.config = parseConfig(rawConfig)
  }

  async connect(_events: BrokerEvents): Promise<void> {
    this.logger.info('MessengerBroker connected (stateless, no-op)')
  }

  async disconnect(): Promise<void> {
    this.logger.info('MessengerBroker disconnected (stateless, no-op)')
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

      const data = (await response.json()) as MessengerSendResponse

      if (!response.ok || data.error) {
        const errorCode =
          data.error?.message ?? `HTTP_${String(response.status)}`
        this.logger.warn(
          { errorCode, recipientId: payload.to },
          'Messenger send failed'
        )
        return { externalId: '', status: 'FAILED', errorCode }
      }

      const externalId = data.message_id ?? ''
      return { externalId, status: 'SENT' }
    } catch (err: unknown) {
      const errorCode =
        err instanceof Error ? err.message : 'UNKNOWN_MESSENGER_ERROR'
      this.logger.error(
        { err, recipientId: payload.to },
        'Messenger send exception'
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

    const attachmentType = MEDIA_TYPE_MAP[payload.type]

    return {
      recipient,
      message: {
        attachment: {
          type: attachmentType,
          payload: {
            url: payload.mediaUrl ?? '',
            is_reusable: true,
          },
        },
      },
    }
  }
}
