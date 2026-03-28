import { type Job, type Queue } from 'bullmq'
import pino from 'pino'
import { Channel, Contact, Conversation, Message } from '@repo/db-chat'
import { CHAT_PUBSUB_CHANNELS } from '@repo/shared'
import type { PubsubClient } from '../types/pubsub-client.js'

const logger = pino({ name: 'incoming-message-processor' })

const META_API_BASE = 'https://graph.facebook.com/v21.0'

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

interface UpsertMessagingContactOptions {
  readonly tenantId: string
  readonly senderId: string
  readonly source: 'MESSENGER' | 'INSTAGRAM'
  readonly name?: string
}

async function upsertMessagingContact(
  options: UpsertMessagingContactOptions
): Promise<string> {
  const { tenantId, senderId, source, name } = options
  const idField = source === 'MESSENGER' ? 'facebookId' : 'instagramId'

  const filter = { tenantId, [idField]: senderId }
  const update: Record<string, unknown> = {
    source,
    [idField]: senderId,
  }
  if (name) {
    update['name'] = name
  }

  const contact = await Contact.findOneAndUpdate(
    filter,
    { $set: update },
    { upsert: true, new: true }
  ).exec()

  return String(contact._id)
}

interface MetaProfileResponse {
  name?: string
  error?: { message: string }
}

async function fetchMetaContactName(
  senderId: string,
  accessToken: string
): Promise<string | undefined> {
  try {
    const url = `${META_API_BASE}/${senderId}?fields=name&access_token=${accessToken}`
    const response = await fetch(url)
    const data = (await response.json()) as MetaProfileResponse

    if (!response.ok || data.error) {
      logger.warn(
        { senderId, error: data.error?.message },
        'Failed to fetch Meta contact name'
      )
      return undefined
    }

    return data.name
  } catch (err: unknown) {
    logger.warn({ err, senderId }, 'Exception fetching Meta contact name')
    return undefined
  }
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

async function publishMessageEvents(
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

async function processMessagingPlatformMessage(
  data: MessagingPlatformJobData,
  pubsubClient: PubsubClient,
  aiBotQueue: Queue
): Promise<void> {
  const {
    source,
    accountId,
    senderId,
    messageId,
    text,
    attachmentType,
    attachmentUrl,
    timestamp,
  } = data

  const channelType = source === 'MESSENGER' ? 'MESSENGER' : 'INSTAGRAM'

  // Deduplicate by externalId
  const alreadyExists = await Message.findOne({ externalId: messageId })
    .lean()
    .exec()
  if (alreadyExists) {
    logger.info(
      { externalId: messageId, source },
      'Duplicate message, skipping'
    )
    return
  }

  // Find channel by type and metaPageId
  const channel = await Channel.findOne({
    type: channelType,
    isActive: true,
    'config.metaPageId': accountId,
  })
    .lean()
    .exec()

  if (!channel) {
    logger.warn(
      { accountId, channelType },
      'No active channel found for messaging platform webhook'
    )
    return
  }

  const tenantId = String(channel.tenantId)
  const channelId = String(channel._id)

  // Extract token from channel config for Graph API calls
  const channelConfig = channel.config as Record<string, unknown> | undefined
  const accessToken =
    typeof channelConfig?.['metaToken'] === 'string'
      ? channelConfig['metaToken']
      : undefined

  // Fetch contact name from Meta if this is a new contact
  const idField = source === 'MESSENGER' ? 'facebookId' : 'instagramId'
  const existingContact = await Contact.findOne({
    tenantId,
    [idField]: senderId,
  })
    .lean()
    .exec()

  let contactName: string | undefined
  if (!existingContact && accessToken) {
    contactName = await fetchMetaContactName(senderId, accessToken)
  }

  const contactId = await upsertMessagingContact({
    tenantId,
    senderId,
    source,
    name: contactName,
  })

  const {
    id: conversationId,
    status: conversationStatus,
    isNew,
  } = await findOrCreateConversationAtomic({
    tenantId,
    channelId,
    contactId,
    phone: senderId,
    hasAiUser: Boolean(channel.aiAgentId),
  })

  const messageType = attachmentType ?? (text ? 'TEXT' : 'OTHER')

  const senderName = existingContact?.name ?? contactName ?? senderId

  const savedMessage = await Message.create({
    conversationId,
    tenantId,
    senderType: 'CLIENT',
    senderName,
    text,
    type: messageType,
    mediaUrl: attachmentUrl,
    status: 'DELIVERED',
    externalId: messageId,
  })

  await publishMessageEvents(pubsubClient, aiBotQueue, {
    savedMessage,
    conversationId,
    tenantId,
    senderName,
    text,
    type: messageType,
    externalId: messageId,
    timestamp,
    conversationStatus,
    isNew,
  })

  logger.info(
    {
      externalId: messageId,
      conversationId,
      tenantId,
      source,
      conversationStatus,
    },
    'Messaging platform incoming message processed'
  )
}
