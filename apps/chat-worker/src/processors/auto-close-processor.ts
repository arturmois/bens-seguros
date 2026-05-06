import { type Job } from 'bullmq'
import { Conversation } from '@repo/db-chat'
import { AUTO_CLOSE_SYSTEM_MESSAGE, CHAT_LIMITS } from '@repo/shared'
import pino from 'pino'

import type { PubsubClient } from '../types/pubsub-client.js'
import { closeConversationOnMongo } from './close-conversation-helper.js'

const logger = pino({ name: 'auto-close-processor' })

function buildCutoffDate(): Date {
  const now = Date.now()
  const cutoff = now - CHAT_LIMITS.AUTO_CLOSE_HOURS * 60 * 60 * 1_000
  return new Date(cutoff)
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
        await closeConversationOnMongo(
          String(conv._id),
          conv.tenantId,
          {
            closedBy: 'system',
            systemMessage: AUTO_CLOSE_SYSTEM_MESSAGE,
          },
          pubsubClient
        )
      } catch (err: unknown) {
        logger.error(
          { err, conversationId: String(conv._id) },
          'Failed to auto-close conversation'
        )
      }
    }
  }
}
