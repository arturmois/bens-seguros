import type { Queue } from 'bullmq'
import { Contact, Conversation } from '@repo/db-chat'
import { CHAT_PUBSUB_CHANNELS } from '@repo/shared'

import type { PubsubClient } from '../types/pubsub-client.js'

export const DEFAULT_JOB_OPTIONS = {
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

/**
 * Lookup-only: returns the open (non-CLOSED) conversation for the
 * (tenant, channel, contact) tuple, or null. Used by the client-command
 * branch — we must not create a stub conversation just to immediately close it.
 */
export async function findOpenConversation(
  tenantId: string,
  channelId: string,
  contactId: string
): Promise<{
  readonly id: string
  readonly status: string
} | null> {
  const doc = await Conversation.findOne({
    tenantId,
    channelId,
    contactId,
    status: { $ne: 'CLOSED' },
  })
    .select('_id status')
    .lean()
    .exec()

  if (!doc) return null
  return { id: String(doc._id), status: String(doc.status) }
}

// ---------------------------------------------------------------------------
// Publish helpers
// ---------------------------------------------------------------------------

interface PublishMessageEventsOptions {
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

/**
 * Updates the conversation lastMessage fields, publishes the inbound message
 * event, the conversation-update event (when new), and the unread-update
 * event. Does NOT enqueue the AI bot — callers decide via enqueueAiBotJob.
 */
export async function publishMessageEvents(
  pubsubClient: PubsubClient,
  options: PublishMessageEventsOptions
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
}

/**
 * Enqueue an AI bot job for a conversation.
 *
 * The jobId convention deduplicates: at most one AI bot job per conversation
 * runs at a time. removeOnComplete/removeOnFail: true frees the jobId
 * immediately so subsequent messages can trigger new AI jobs.
 */
export async function enqueueAiBotJob(
  aiBotQueue: Queue,
  conversationId: string,
  tenantId: string,
  messageId: string
): Promise<void> {
  await aiBotQueue.add(
    'ai-bot',
    { conversationId, tenantId, messageId },
    {
      ...DEFAULT_JOB_OPTIONS,
      jobId: `ai-bot-${conversationId}`,
      removeOnComplete: true,
      removeOnFail: true,
    }
  )
}
