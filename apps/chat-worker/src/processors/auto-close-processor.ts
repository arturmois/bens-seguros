import { type Job } from 'bullmq'
import pino from 'pino'
import { Conversation, Message } from '@repo/db-chat'
import { CHAT_PUBSUB_CHANNELS, CHAT_LIMITS } from '@repo/shared'
import type { PubsubClient } from '../types/pubsub-client.js'

const logger = pino({ name: 'auto-close-processor' })

const AUTO_CLOSE_SYSTEM_MESSAGE = 'Atendimento encerrado por inatividade'

function buildCutoffDate(): Date {
  const now = Date.now()
  const cutoff = now - CHAT_LIMITS.AUTO_CLOSE_HOURS * 60 * 60 * 1_000
  return new Date(cutoff)
}

async function closeConversation(
  conversationId: string,
  tenantId: string,
  pubsubClient: PubsubClient
): Promise<void> {
  const closedAt = new Date()

  await Conversation.updateOne(
    { _id: conversationId, tenantId },
    {
      $set: {
        status: 'CLOSED',
        closedAt,
        closedBy: 'system',
      },
    }
  ).exec()

  await Message.create({
    conversationId,
    tenantId,
    senderType: 'SYSTEM',
    text: AUTO_CLOSE_SYSTEM_MESSAGE,
    type: 'TEXT',
    status: 'DELIVERED',
  })

  await pubsubClient.publish(
    CHAT_PUBSUB_CHANNELS.CONVERSATION_UPDATE,
    JSON.stringify({
      tenantId,
      conversationId,
      status: 'CLOSED',
      closedBy: 'system',
    })
  )

  logger.info({ conversationId, tenantId }, 'Conversation auto-closed')
}

export function createAutoCloseProcessor(pubsubClient: PubsubClient) {
  return async function processAutoClose(_job: Job): Promise<void> {
    const cutoff = buildCutoffDate()

    const staleConversations = await Conversation.find({
      updatedAt: { $lt: cutoff },
      status: { $ne: 'CLOSED' },
    })
      .select('_id tenantId')
      .lean()
      .exec()

    logger.info(
      {
        count: staleConversations.length,
        cutoffHours: CHAT_LIMITS.AUTO_CLOSE_HOURS,
      },
      'Auto-close scan complete'
    )

    for (const conv of staleConversations) {
      try {
        await closeConversation(String(conv._id), conv.tenantId, pubsubClient)
      } catch (err: unknown) {
        logger.error(
          { err, conversationId: String(conv._id) },
          'Failed to auto-close conversation'
        )
      }
    }
  }
}
