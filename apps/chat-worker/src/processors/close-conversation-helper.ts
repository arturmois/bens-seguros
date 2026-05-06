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

/**
 * Atomically closes a conversation on MongoDB and publishes the resulting
 * events. Idempotent: if the conversation is already CLOSED (or does not
 * exist), returns { closed: false } without duplicating the SYSTEM message
 * or pubsub event.
 *
 * Used both by the auto-close BullMQ processor and by the client-command
 * branch in incoming-message-processor.
 */
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
