import { type Job, type Queue } from 'bullmq'
import pino from 'pino'
import { Channel, Contact, Conversation, Message } from '@repo/db-chat'
import { CHAT_PUBSUB_CHANNELS } from '@repo/shared'
import type { PubsubClient } from '../types/pubsub-client.js'

const logger = pino({ name: 'incoming-message-processor' })

const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 1000 },
  removeOnComplete: { age: 3600 },
  removeOnFail: { age: 86_400 },
}

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

async function upsertContact(
  tenantId: string,
  phone: string,
  pushName: string | undefined
): Promise<string> {
  const contact = await Contact.findOneAndUpdate(
    { tenantId, whatsappPhone: phone },
    { $set: { pushName } },
    { upsert: true, new: true }
  ).exec()

  return String(contact._id)
}

interface FindOrCreateConversationOptions {
  readonly tenantId: string
  readonly channelId: string
  readonly contactId: string
  readonly phone: string
  readonly hasAiUser: boolean
}

interface FindOrCreateConversationResult {
  readonly id: string
  readonly status: string
  readonly isNew: boolean
}

async function findOrCreateConversationAtomic(
  options: FindOrCreateConversationOptions
): Promise<FindOrCreateConversationResult> {
  const { tenantId, channelId, contactId, phone, hasAiUser } = options
  const initialStatus = hasAiUser ? 'BOT_ACTIVE' : 'WAITING_HUMAN'

  const result = await Conversation.findOneAndUpdate(
    { tenantId, channelId, contactId, status: { $ne: 'CLOSED' } },
    {
      $setOnInsert: {
        tenantId,
        channelId,
        contactId,
        whatsappPhone: phone,
        status: initialStatus,
      },
    },
    { upsert: true, new: true, includeResultMetadata: true }
  ).exec()

  const isNew = Boolean(result.lastErrorObject?.upserted)
  const doc = result.value

  if (!doc) {
    throw new Error('findOneAndUpdate with upsert returned null')
  }

  return {
    id: String(doc._id),
    status: String(doc.status),
    isNew,
  }
}

export function createIncomingMessageProcessor(
  pubsubClient: PubsubClient,
  aiBotQueue: Queue
) {
  return async function processIncomingMessage(
    job: Job<IncomingMessageJobData>
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
    } = job.data

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
      hasAiUser: Boolean(channel.aiUserId),
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

    const messageAt = new Date(timestamp)
    await Conversation.updateOne(
      { _id: conversationId, tenantId },
      {
        $set: {
          lastMessageText: text,
          lastMessageAt: messageAt,
          updatedAt: messageAt,
        },
      }
    ).exec()

    const messagePayload = JSON.stringify({
      id: String(savedMessage._id),
      conversationId,
      tenantId,
      senderType: 'CLIENT',
      senderName: pushName ?? from,
      senderId: null,
      text: text ?? null,
      type: type ?? 'TEXT',
      status: 'DELIVERED',
      externalId: externalId ?? null,
      createdAt:
        savedMessage.createdAt?.toISOString() ?? new Date().toISOString(),
    })

    await pubsubClient.publish(
      CHAT_PUBSUB_CHANNELS.INCOMING_MESSAGE,
      messagePayload
    )

    if (isNew) {
      await pubsubClient.publish(
        CHAT_PUBSUB_CHANNELS.CONVERSATION_UPDATE,
        JSON.stringify({
          tenantId,
          conversationId,
          status: conversationStatus,
          isNew: true,
        })
      )
    }

    await pubsubClient.publish(
      CHAT_PUBSUB_CHANNELS.UNREAD_UPDATE,
      JSON.stringify({ tenantId, conversationId, userId: null })
    )

    if (conversationStatus === 'BOT_ACTIVE') {
      await aiBotQueue.add(
        'ai-bot',
        {
          conversationId,
          tenantId,
          messageId: String(savedMessage._id),
        },
        DEFAULT_JOB_OPTIONS
      )
    }

    logger.info(
      { externalId, conversationId, tenantId, conversationStatus },
      'Incoming message processed'
    )
  }
}
