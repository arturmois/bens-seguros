import type { Queue } from 'bullmq'
import pino from 'pino'
import { z } from 'zod'
import { Channel, Contact, Message } from '@repo/db-chat'
import { isRecord } from '@repo/shared'
import type { PubsubClient } from '../types/pubsub-client.js'
import type { MessagingPlatformJobData } from './incoming-message-processor.js'
import {
  findOrCreateConversationAtomic,
  publishMessageEvents,
} from './incoming-message-helpers.js'

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
    const url = `${META_API_BASE}/${senderId}?fields=name&access_token=${accessToken}`
    const response = await fetch(url)
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
