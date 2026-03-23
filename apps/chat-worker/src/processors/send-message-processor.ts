import { UnrecoverableError, DelayedError, type Job } from 'bullmq'
import pino from 'pino'
import { Channel, Message } from '@repo/db-chat'
import { CHAT_PUBSUB_CHANNELS } from '@repo/shared'
import type * as BaileysManager from '../messaging/baileys-manager.js'
import { MetaBroker } from '../messaging/meta-broker.js'
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
  if (brokerType === 'BAILEYS') {
    const broker = manager.getChannel(channelId)
    if (!broker) {
      throw new UnrecoverableError(
        `Baileys broker not found for channelId=${channelId}`
      )
    }
    return broker
  }

  return new MetaBroker(toConfigRecord(channelConfig))
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

    logger.info(
      { messageId, externalId: result.externalId },
      'Message sent successfully'
    )
  }
}
