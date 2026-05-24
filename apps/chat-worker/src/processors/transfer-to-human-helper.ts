import { Conversation, Message } from '@repo/db-chat'
import { CHAT_PUBSUB_CHANNELS } from '@repo/shared'
import pino from 'pino'

import type { PubsubClient } from '../types/pubsub-client.js'

const logger = pino({ name: 'transfer-to-human-helper' })

export interface TransferToHumanOptions {
  readonly reason: string
  readonly systemMessage: string
}

export interface TransferToHumanResult {
  readonly transferred: boolean
  readonly reason: string
}

export async function transferConversationToHuman(
  conversationId: string,
  tenantId: string,
  pubsubClient: PubsubClient,
  options: TransferToHumanOptions
): Promise<TransferToHumanResult> {
  const updateResult = await Conversation.updateOne(
    { _id: conversationId, tenantId, status: 'BOT_ACTIVE' },
    { $set: { status: 'WAITING_HUMAN' } }
  ).exec()
  if (updateResult.modifiedCount === 0) {
    logger.debug(
      { conversationId, tenantId, reason: options.reason },
      'Conversation not in BOT_ACTIVE state, skipping transfer'
    )
    return { transferred: false, reason: options.reason }
  }
  try {
    const systemMessage = await Message.create({
      conversationId,
      tenantId,
      senderType: 'SYSTEM',
      text: options.systemMessage,
      type: 'TEXT',
      status: 'DELIVERED',
    })
    await pubsubClient.publish(
      CHAT_PUBSUB_CHANNELS.INCOMING_MESSAGE,
      JSON.stringify({
        id: String(systemMessage._id),
        conversationId,
        tenantId,
        senderType: 'SYSTEM',
        senderName: null,
        senderId: null,
        text: options.systemMessage,
        type: 'TEXT',
        status: 'DELIVERED',
        externalId: null,
        createdAt:
          systemMessage.createdAt?.toISOString() ?? new Date().toISOString(),
      })
    )
    await pubsubClient.publish(
      CHAT_PUBSUB_CHANNELS.CONVERSATION_UPDATE,
      JSON.stringify({ tenantId, conversationId, status: 'WAITING_HUMAN' })
    )
  } catch (notifyErr: unknown) {
    logger.error(
      { err: notifyErr, conversationId, tenantId, reason: options.reason },
      'Conversation status moved to WAITING_HUMAN but system message or pubsub failed; UI may show stale state until next event'
    )
  }
  logger.info(
    { conversationId, tenantId, reason: options.reason },
    'Conversation transferred to human'
  )
  return { transferred: true, reason: options.reason }
}
