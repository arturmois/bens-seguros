import { type Job, type Queue } from 'bullmq'
import pino from 'pino'
import { Channel, Message } from '@repo/db-chat'
import type { PubsubClient } from '../types/pubsub-client.js'
import {
  findOrCreateConversationAtomic,
  publishMessageEvents,
  upsertContact,
} from './incoming-message-helpers.js'
import { processMessagingPlatformMessage } from './messaging-platform-processor.js'

const logger = pino({ name: 'incoming-message-processor' })

// ---------------------------------------------------------------------------
// Job data types
// ---------------------------------------------------------------------------

export interface IncomingMessageJobData {
  readonly channelId: string
  readonly tenantId: string
  readonly from: string
  readonly pushName?: string
  readonly text?: string
  readonly type: 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT' | 'OTHER'
  readonly mediaUrl?: string
  readonly externalId: string
  readonly timestamp: string
}

export interface MessagingPlatformJobData {
  readonly source: 'MESSENGER' | 'INSTAGRAM'
  readonly accountId: string
  readonly senderId: string
  readonly messageId: string
  readonly text?: string
  readonly attachmentType?: string
  readonly attachmentUrl?: string
  readonly timestamp: number
}

export interface MetaWhatsAppJobData {
  readonly source: 'META'
  readonly accountId: string
  readonly field: string
  readonly value: unknown
}

type ProcessIncomingJobData =
  | IncomingMessageJobData
  | MessagingPlatformJobData
  | MetaWhatsAppJobData

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

function isMessagingPlatformJob(
  data: ProcessIncomingJobData
): data is MessagingPlatformJobData {
  return (
    'source' in data &&
    (data.source === 'MESSENGER' || data.source === 'INSTAGRAM')
  )
}

function isMetaWhatsAppJob(
  data: ProcessIncomingJobData
): data is MetaWhatsAppJobData {
  return 'source' in data && data.source === 'META'
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createIncomingMessageProcessor(
  pubsubClient: PubsubClient,
  aiBotQueue: Queue
) {
  return async function processIncomingMessage(
    job: Job<ProcessIncomingJobData>
  ): Promise<void> {
    const data = job.data

    if (isMessagingPlatformJob(data)) {
      await processMessagingPlatformMessage(data, pubsubClient, aiBotQueue)
      return
    }

    if (isMetaWhatsAppJob(data)) {
      // Meta WhatsApp webhook data is passed through as-is for now
      logger.debug(
        { accountId: data.accountId, field: data.field },
        'Meta WhatsApp incoming (passthrough)'
      )
      return
    }

    await processBaileysMessage(data, pubsubClient, aiBotQueue)
  }
}

// ---------------------------------------------------------------------------
// Baileys message handler
// ---------------------------------------------------------------------------

async function processBaileysMessage(
  data: IncomingMessageJobData,
  pubsubClient: PubsubClient,
  aiBotQueue: Queue
): Promise<void> {
  const {
    channelId,
    tenantId,
    from,
    pushName,
    text,
    type,
    mediaUrl,
    externalId,
    timestamp,
  } = data

  const alreadyExists = await Message.findOne({ externalId, tenantId })
    .lean()
    .exec()
  if (alreadyExists) {
    logger.info({ externalId, tenantId }, 'Duplicate message, skipping')
    return
  }

  const channel = await Channel.findOne({ _id: channelId, tenantId })
    .lean()
    .exec()
  if (!channel) {
    logger.error(
      { channelId, tenantId },
      'Channel not found for incoming message'
    )
    return
  }

  const contactId = await upsertContact(tenantId, from, pushName)

  const {
    id: conversationId,
    status: conversationStatus,
    isNew,
  } = await findOrCreateConversationAtomic({
    tenantId,
    channelId,
    contactId,
    phone: from,
    hasAiUser: Boolean(channel.aiAgentId),
  })

  const savedMessage = await Message.create({
    conversationId,
    tenantId,
    senderType: 'CLIENT',
    senderName: pushName,
    text,
    type,
    mediaUrl,
    status: 'DELIVERED',
    externalId,
  })

  await publishMessageEvents(pubsubClient, aiBotQueue, {
    savedMessage,
    conversationId,
    tenantId,
    senderName: pushName ?? from,
    text,
    type,
    externalId,
    timestamp,
    conversationStatus,
    isNew,
  })

  logger.info(
    { externalId, conversationId, tenantId, conversationStatus },
    'Incoming message processed'
  )
}
