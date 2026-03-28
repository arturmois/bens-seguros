import { UnrecoverableError, DelayedError, type Job } from 'bullmq'
import pino from 'pino'
import { Channel, Message } from '@repo/db-chat'
import { CHAT_PUBSUB_CHANNELS } from '@repo/shared'
import type * as BaileysManager from '../messaging/baileys-manager.js'
import { MetaBroker } from '../messaging/meta-broker.js'
import { WebChatBroker } from '../messaging/web-chat-broker.js'
import { MessengerBroker } from '../messaging/messenger-broker.js'
import { InstagramBroker } from '../messaging/instagram-broker.js'
import type { Broker } from '../messaging/broker.js'
import type { PubsubClient } from '../types/pubsub-client.js'

const logger = pino({ name: 'send-message-processor' })

const PERMANENT_ERROR_CODES = [
  'INVALID_NUMBER',
  'BLOCKED',
  'BANNED',
  'DEREGISTERED',
] as const

export interface SendMessageJobData {
  readonly messageId: string
  readonly conversationId: string
  readonly channelId: string
  readonly tenantId: string
  readonly to: string
  readonly text?: string
  readonly mediaUrl?: string
  readonly type: 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT'
}

function isPermanentError(errorCode: string): boolean {
  return (PERMANENT_ERROR_CODES as ReadonlyArray<string>).includes(errorCode)
}

function toConfigRecord(config: unknown): Record<string, unknown> {
  if (config !== null && typeof config === 'object' && !Array.isArray(config)) {
    const entries = Object.entries(config as Record<string, unknown>)
    return Object.fromEntries(entries)
  }
  return {}
}

function selectBroker(
  brokerType: string,
  channelId: string,
  channelConfig: unknown,
  manager: typeof BaileysManager
): Broker {
  switch (brokerType) {
    case 'BAILEYS': {
      const broker = manager.getChannel(channelId)
      if (!broker) {
        throw new UnrecoverableError(
          `Baileys broker not found for channelId=${channelId}`
        )
      }
      return broker
    }
    case 'META':
      return new MetaBroker(toConfigRecord(channelConfig))
    case 'WEB_CHAT':
      return new WebChatBroker()
    case 'MESSENGER':
      return new MessengerBroker(toConfigRecord(channelConfig))
    case 'INSTAGRAM':
      return new InstagramBroker(toConfigRecord(channelConfig))
    default:
      throw new UnrecoverableError(`Unknown broker type: ${brokerType}`)
  }
}

export function createSendMessageProcessor(
  manager: typeof BaileysManager,
  pubsubClient: PubsubClient
) {
  return async function processSendMessage(
    job: Job<SendMessageJobData>
  ): Promise<void> {
    const { messageId, channelId, tenantId, to, text, mediaUrl, type } =
      job.data

    const channel = await Channel.findOne({ _id: channelId, tenantId })
      .lean()
      .exec()
    if (!channel) {
      throw new UnrecoverableError(
        `Channel not found: channelId=${channelId} tenantId=${tenantId}`
      )
    }

    const broker = selectBroker(
      channel.brokerType ?? 'BAILEYS',
      channelId,
      channel.config,
      manager
    )

    const result = await broker.sendMessage({ to, text, mediaUrl, type })

    if (result.status === 'FAILED') {
      const errorCode = result.errorCode ?? 'UNKNOWN'

      if (isPermanentError(errorCode)) {
        await Message.updateOne(
          { _id: messageId, tenantId },
          { $set: { status: 'FAILED' } }
        ).exec()
        logger.warn(
          { messageId, errorCode },
          'Permanent send failure, no retry'
        )
        throw new UnrecoverableError(`Permanent send error: ${errorCode}`)
      }

      if (errorCode === 'RATE_LIMIT') {
        throw new DelayedError('Rate limit reached, delaying retry')
      }

      throw new Error(`Transient send error: ${errorCode}`)
    }

    await Message.updateOne(
      { _id: messageId, tenantId },
      { $set: { status: 'SENT', externalId: result.externalId } }
    ).exec()

    await pubsubClient.publish(
      CHAT_PUBSUB_CHANNELS.MESSAGE_STATUS,
      JSON.stringify({
        messageId,
        conversationId: job.data.conversationId,
        tenantId,
        status: 'SENT',
        externalId: result.externalId,
      })
    )

    // WebChat: publish message content so /widget namespace delivers to visitor.
    // External brokers deliver via their own APIs, but WebChat has no external
    // channel — delivery happens via Redis pub/sub to Socket.IO /widget.
    if (channel.brokerType === 'WEB_CHAT') {
      const sentMessage = await Message.findById(messageId).lean().exec()
      if (sentMessage) {
        await pubsubClient.publish(
          CHAT_PUBSUB_CHANNELS.INCOMING_MESSAGE,
          JSON.stringify({
            tenantId,
            conversationId: job.data.conversationId,
            message: sentMessage,
          })
        )
      }
    }

    logger.info(
      { messageId, externalId: result.externalId },
      'Message sent successfully'
    )
  }
}
