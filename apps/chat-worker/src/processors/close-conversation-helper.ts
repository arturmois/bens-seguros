import { Conversation, Message } from '@repo/db-chat'
import { CHAT_PUBSUB_CHANNELS } from '@repo/shared'
import pino from 'pino'

import type { PubsubClient } from '../types/pubsub-client.js'

const logger = pino({ name: 'close-conversation-helper' })

export interface CloseConversationOptions {
  readonly closedBy: string
  readonly systemMessage: string
}

export interface CloseConversationResult {
  readonly closed: boolean
}

export async function closeConversationOnMongo(
  conversationId: string,
  tenantId: string,
  options: CloseConversationOptions,
  pubsubClient: PubsubClient
): Promise<CloseConversationResult> {
  const closedAt = new Date()
  const result = await Conversation.updateOne(
    { _id: conversationId, tenantId, status: { $ne: 'CLOSED' } },
    {
      $set: {
        status: 'CLOSED',
        closedAt,
        closedBy: options.closedBy,
      },
    }
  ).exec()
  if (result.modifiedCount === 0) {
    logger.debug(
      { conversationId, tenantId, closedBy: options.closedBy },
      'Conversation already closed or not found, skipping'
    )
    return { closed: false }
  }
  await Message.create({
    conversationId,
    tenantId,
    senderType: 'SYSTEM',
    text: options.systemMessage,
    type: 'TEXT',
    status: 'DELIVERED',
  })
  await pubsubClient.publish(
    CHAT_PUBSUB_CHANNELS.CONVERSATION_UPDATE,
    JSON.stringify({
      tenantId,
      conversationId,
      status: 'CLOSED',
      closedBy: options.closedBy,
    })
  )
  logger.info(
    { conversationId, tenantId, closedBy: options.closedBy },
    'Conversation closed'
  )
  return { closed: true }
}
