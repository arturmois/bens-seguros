import { type Job } from 'bullmq'
import pino from 'pino'
import { Conversation, Message } from '@repo/db-chat'
import { CHAT_PUBSUB_CHANNELS } from '@repo/shared'
import type { PubsubClient } from '../types/pubsub-client.js'

const logger = pino({ name: 'ai-bot-processor' })

const ESCALATION_MESSAGE = 'Transferido para um atendente. Aguarde.'

export interface AiBotJobData {
  readonly conversationId: string
  readonly tenantId: string
  readonly messageId: string
}

// STUB: Real implementation comes in Fase 6 with @repo/ai.
// Immediately escalates every conversation to WAITING_HUMAN.
export function createAiBotProcessor(pubsubClient: PubsubClient) {
  return async function processAiBot(job: Job<AiBotJobData>): Promise<void> {
    const { conversationId, tenantId } = job.data

    await Conversation.updateOne(
      { _id: conversationId, tenantId },
      { $set: { status: 'WAITING_HUMAN' } }
    ).exec()

    await Message.create({
      conversationId,
      tenantId,
      senderType: 'SYSTEM',
      text: ESCALATION_MESSAGE,
      type: 'TEXT',
      status: 'DELIVERED',
    })

    await pubsubClient.publish(
      CHAT_PUBSUB_CHANNELS.CONVERSATION_UPDATE,
      JSON.stringify({ tenantId, conversationId, status: 'WAITING_HUMAN' })
    )

    logger.info(
      { conversationId, tenantId },
      'AI bot stub: escalated to WAITING_HUMAN'
    )
  }
}
