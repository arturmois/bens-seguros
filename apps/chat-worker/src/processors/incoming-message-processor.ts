import { type Job, type Queue } from 'bullmq'
import { Channel, Message } from '@repo/db-chat'
import {
  CLIENT_CLOSE_CONFIRMATION_TEXT,
  CLIENT_CLOSE_SYSTEM_MESSAGE,
  detectClientCommand,
} from '@repo/shared'
import pino from 'pino'

import type { PubsubClient } from '../types/pubsub-client.js'
import { closeConversationOnMongo } from './close-conversation-helper.js'
import {
  DEFAULT_JOB_OPTIONS,
  enqueueAiBotJob,
  findOpenConversation,
  findOrCreateConversationAtomic,
  publishMessageEvents,
  upsertContact,
} from './incoming-message-helpers.js'
import { processMessagingPlatformMessage } from './messaging-platform-processor.js'

const logger = pino({ name: 'incoming-message-processor' })

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

export function createIncomingMessageProcessor(
  pubsubClient: PubsubClient,
  aiBotQueue: Queue,
  sendMessageQueue: Queue
) {
  return async function processIncomingMessage(
    job: Job<ProcessIncomingJobData>
  ): Promise<void> {
    const data = job.data
    if (isMessagingPlatformJob(data)) {
      await processMessagingPlatformMessage(
        data,
        pubsubClient,
        aiBotQueue,
        sendMessageQueue
      )
      return
    }
    if (isMetaWhatsAppJob(data)) {
      logger.debug(
        { accountId: data.accountId, field: data.field },
        'Meta WhatsApp incoming (passthrough)'
      )
      return
    }
    await processBaileysMessage(
      data,
      pubsubClient,
      aiBotQueue,
      sendMessageQueue
    )
  }
}

async function processBaileysMessage(
  data: IncomingMessageJobData,
  pubsubClient: PubsubClient,
  aiBotQueue: Queue,
  sendMessageQueue: Queue
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
  const command = detectClientCommand(text, type)
  if (command === 'CLOSE') {
    await handleClientCloseCommand({
      tenantId,
      channelId,
      contactId,
      from,
      pushName: pushName ?? null,
      text: text ?? '',
      externalId,
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
  await publishMessageEvents(pubsubClient, {
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
  if (conversationStatus === 'BOT_ACTIVE') {
    await enqueueAiBotJob(
      aiBotQueue,
      conversationId,
      tenantId,
      String(savedMessage._id)
    )
  }
  logger.info(
    { externalId, conversationId, tenantId, conversationStatus },
    'Incoming message processed'
  )
}

interface HandleClientCloseCommandOptions {
  readonly tenantId: string
  readonly channelId: string
  readonly contactId: string
  readonly from: string
  readonly pushName: string | null
  readonly text: string
  readonly externalId: string
  readonly timestamp: string
  readonly pubsubClient: PubsubClient
  readonly sendMessageQueue: Queue
}

async function handleClientCloseCommand(
  options: HandleClientCloseCommandOptions
): Promise<void> {
  const {
    tenantId,
    channelId,
    contactId,
    from,
    pushName,
    text,
    externalId,
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
    senderName: pushName,
    text,
    type: 'TEXT',
    status: 'DELIVERED',
    externalId,
  })
  await publishMessageEvents(pubsubClient, {
    savedMessage: savedClientMessage,
    conversationId: open.id,
    tenantId,
    senderName: pushName ?? from,
    text,
    type: 'TEXT',
    externalId,
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
        to: from,
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
    'Client close command handled — conversation closed and confirmation enqueued'
  )
}
