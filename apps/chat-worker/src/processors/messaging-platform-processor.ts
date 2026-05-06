import type { Queue } from 'bullmq'
import { Channel, Contact, Message } from '@repo/db-chat'
import {
  CLIENT_CLOSE_CONFIRMATION_TEXT,
  CLIENT_CLOSE_SYSTEM_MESSAGE,
  detectClientCommand,
  isRecord,
} from '@repo/shared'
import pino from 'pino'
import { z } from 'zod'

import type { PubsubClient } from '../types/pubsub-client.js'
import { closeConversationOnMongo } from './close-conversation-helper.js'
import {
  DEFAULT_JOB_OPTIONS,
  enqueueAiBotJob,
  findOpenConversation,
  findOrCreateConversationAtomic,
  publishMessageEvents,
} from './incoming-message-helpers.js'
import type { MessagingPlatformJobData } from './incoming-message-processor.js'

const logger = pino({ name: 'messaging-platform-processor' })

const META_API_BASE = 'https://graph.facebook.com/v21.0'

const metaProfileResponseSchema = z.object({
  name: z.string().optional(),
  error: z.object({ message: z.string() }).optional(),
})

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

async function fetchMetaContactName(
  senderId: string,
  accessToken: string
): Promise<string | undefined> {
  try {
    const url = `${META_API_BASE}/${senderId}?fields=name`
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const json: unknown = await response.json()
    const parsed = metaProfileResponseSchema.safeParse(json)
    const data = parsed.success
      ? parsed.data
      : { name: undefined, error: undefined }

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

export async function processMessagingPlatformMessage(
  data: MessagingPlatformJobData,
  pubsubClient: PubsubClient,
  aiBotQueue: Queue,
  sendMessageQueue: Queue
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
  const channelConfig = isRecord(channel.config) ? channel.config : undefined
  const accessToken =
    typeof channelConfig?.['metaToken'] === 'string'
      ? channelConfig['metaToken']
      : undefined

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

  const messageType = attachmentType ?? (text ? 'TEXT' : 'OTHER')

  const command = detectClientCommand(text, messageType)
  if (command === 'CLOSE') {
    await handleClientCloseCommandPlatform({
      tenantId,
      channelId,
      contactId,
      senderId,
      contactName: existingContact?.name ?? contactName ?? null,
      text: text ?? '',
      messageId,
      timestamp,
      pubsubClient,
      sendMessageQueue,
    })
    return
  }

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

  await publishMessageEvents(pubsubClient, {
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

  if (conversationStatus === 'BOT_ACTIVE') {
    await enqueueAiBotJob(
      aiBotQueue,
      conversationId,
      tenantId,
      String(savedMessage._id)
    )
  }

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

// ---------------------------------------------------------------------------
// Client close command handler
// ---------------------------------------------------------------------------

interface HandleClientCloseCommandPlatformOptions {
  readonly tenantId: string
  readonly channelId: string
  readonly contactId: string
  readonly senderId: string
  readonly contactName: string | null
  readonly text: string
  readonly messageId: string
  readonly timestamp: number
  readonly pubsubClient: PubsubClient
  readonly sendMessageQueue: Queue
}

async function handleClientCloseCommandPlatform(
  options: HandleClientCloseCommandPlatformOptions
): Promise<void> {
  const {
    tenantId,
    channelId,
    contactId,
    senderId,
    contactName,
    text,
    messageId,
    timestamp,
    pubsubClient,
    sendMessageQueue,
  } = options

  const open = await findOpenConversation(tenantId, channelId, contactId)
  if (!open) {
    logger.debug(
      { tenantId, channelId, contactId },
      'Client close command without open conversation, ignoring'
    )
    return
  }

  const savedClientMessage = await Message.create({
    conversationId: open.id,
    tenantId,
    senderType: 'CLIENT',
    senderName: contactName,
    text,
    type: 'TEXT',
    status: 'DELIVERED',
    externalId: messageId,
  })

  await publishMessageEvents(pubsubClient, {
    savedMessage: savedClientMessage,
    conversationId: open.id,
    tenantId,
    senderName: contactName ?? senderId,
    text,
    type: 'TEXT',
    externalId: messageId,
    timestamp,
    conversationStatus: open.status,
    isNew: false,
  })

  const closeResult = await closeConversationOnMongo(
    open.id,
    tenantId,
    {
      closedBy: 'client',
      systemMessage: CLIENT_CLOSE_SYSTEM_MESSAGE,
    },
    pubsubClient
  )

  if (!closeResult.closed) {
    logger.debug(
      { conversationId: open.id, tenantId },
      'Conversation race-closed, skipping confirmation send'
    )
    return
  }

  const confirmationMessage = await Message.create({
    conversationId: open.id,
    tenantId,
    senderType: 'SYSTEM',
    text: CLIENT_CLOSE_CONFIRMATION_TEXT,
    type: 'TEXT',
    status: 'PENDING',
  })

  try {
    await sendMessageQueue.add(
      'send-message',
      {
        messageId: String(confirmationMessage._id),
        conversationId: open.id,
        channelId,
        tenantId,
        to: senderId,
        text: CLIENT_CLOSE_CONFIRMATION_TEXT,
        type: 'TEXT',
      },
      {
        ...DEFAULT_JOB_OPTIONS,
        jobId: `fim-confirm-${String(confirmationMessage._id)}`,
      }
    )
  } catch (err: unknown) {
    await Message.updateOne(
      { _id: confirmationMessage._id },
      { $set: { status: 'FAILED' } }
    )
    throw err
  }

  logger.info(
    { conversationId: open.id, tenantId },
    'Client close command handled (platform) — conversation closed and confirmation enqueued'
  )
}
