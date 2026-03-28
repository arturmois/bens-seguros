import type { Queue } from 'bullmq'
import { Contact, Conversation } from '@repo/db-chat'
import { CHAT_PUBSUB_CHANNELS } from '@repo/shared'
import type { PubsubClient } from '../types/pubsub-client.js'

const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 1000 },
  removeOnComplete: { age: 3600 },
  removeOnFail: { age: 86_400 },
}

// ---------------------------------------------------------------------------
// Contact helpers
// ---------------------------------------------------------------------------

export async function upsertContact(
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

// ---------------------------------------------------------------------------
// Conversation helpers
// ---------------------------------------------------------------------------

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

export async function findOrCreateConversationAtomic(
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

// ---------------------------------------------------------------------------
// Publish helpers
// ---------------------------------------------------------------------------

export async function publishMessageEvents(
  pubsubClient: PubsubClient,
  aiBotQueue: Queue,
  options: {
    readonly savedMessage: { readonly _id: unknown; readonly createdAt?: Date }
    readonly conversationId: string
    readonly tenantId: string
    readonly senderName: string
    readonly text?: string
    readonly type: string
    readonly externalId: string
    readonly timestamp: string | number
    readonly conversationStatus: string
    readonly isNew: boolean
  }
): Promise<void> {
  const {
    savedMessage,
    conversationId,
    tenantId,
    senderName,
    text,
    type,
    externalId,
    timestamp,
    conversationStatus,
    isNew,
  } = options

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
    senderName,
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
      {
        ...DEFAULT_JOB_OPTIONS,
        // Deduplicate: only one AI bot job per conversation at a time.
        // removeOnComplete/removeOnFail: true ensures the jobId is freed
        // immediately so subsequent messages can trigger new AI jobs.
        jobId: `ai-bot-${conversationId}`,
        removeOnComplete: true,
        removeOnFail: true,
      }
    )
  }
}
