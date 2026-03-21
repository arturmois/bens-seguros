import { type Job, type Queue } from 'bullmq';
import pino from 'pino';
import { Channel, Contact, Conversation, Message } from '@repo/db-chat';
import { CHAT_PUBSUB_CHANNELS } from '@repo/shared';
import type { PubsubClient } from '../types/pubsub-client.js';

const logger = pino({ name: 'incoming-message-processor' });

export interface IncomingMessageJobData {
  readonly channelId: string;
  readonly tenantId: string;
  readonly from: string;
  readonly pushName?: string;
  readonly text?: string;
  readonly type: 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT' | 'OTHER';
  readonly mediaUrl?: string;
  readonly externalId: string;
  readonly timestamp: string;
}

async function upsertContact(
  tenantId: string,
  phone: string,
  pushName: string | undefined,
): Promise<string> {
  const contact = await Contact.findOneAndUpdate(
    { tenantId, whatsappPhone: phone },
    { $set: { pushName } },
    { upsert: true, new: true },
  ).exec();

  return String(contact._id);
}

async function findOrCreateConversation(
  tenantId: string,
  channelId: string,
  contactId: string,
  phone: string,
  hasAiUser: boolean,
): Promise<{ id: string; status: string }> {
  const existing = await Conversation.findOne({
    tenantId,
    channelId,
    contactId,
    status: { $ne: 'CLOSED' },
  })
    .lean()
    .exec();

  if (existing) {
    return { id: String(existing._id), status: existing.status };
  }

  const initialStatus = hasAiUser ? 'BOT_ACTIVE' : 'WAITING_HUMAN';
  const created = await Conversation.create({
    tenantId,
    channelId,
    contactId,
    whatsappPhone: phone,
    status: initialStatus,
  });

  return { id: String(created._id), status: initialStatus };
}

export function createIncomingMessageProcessor(pubsubClient: PubsubClient, aiBotQueue: Queue) {
  return async function processIncomingMessage(job: Job<IncomingMessageJobData>): Promise<void> {
    const { channelId, tenantId, from, pushName, text, type, mediaUrl, externalId, timestamp } =
      job.data;

    const alreadyExists = await Message.findOne({ externalId, tenantId }).lean().exec();
    if (alreadyExists) {
      logger.info({ externalId, tenantId }, 'Duplicate message, skipping');
      return;
    }

    const channel = await Channel.findOne({ _id: channelId, tenantId }).lean().exec();
    if (!channel) {
      logger.error({ channelId, tenantId }, 'Channel not found for incoming message');
      return;
    }

    const contactId = await upsertContact(tenantId, from, pushName);

    const { id: conversationId, status: conversationStatus } = await findOrCreateConversation(
      tenantId,
      channelId,
      contactId,
      from,
      Boolean(channel.aiUserId),
    );

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
    });

    const messageAt = new Date(timestamp);
    await Conversation.updateOne(
      { _id: conversationId, tenantId },
      {
        $set: {
          lastMessageText: text,
          lastMessageAt: messageAt,
          updatedAt: messageAt,
        },
      },
    ).exec();

    const messagePayload = JSON.stringify({
      messageId: String(savedMessage._id),
      conversationId,
      tenantId,
      channelId,
      from,
      text,
      type,
      externalId,
      timestamp,
    });

    await pubsubClient.publish(CHAT_PUBSUB_CHANNELS.INCOMING_MESSAGE, messagePayload);

    await pubsubClient.publish(
      CHAT_PUBSUB_CHANNELS.UNREAD_UPDATE,
      JSON.stringify({ tenantId, conversationId }),
    );

    if (conversationStatus === 'BOT_ACTIVE') {
      await aiBotQueue.add('ai-bot', {
        conversationId,
        tenantId,
        messageId: String(savedMessage._id),
      });
    }

    logger.info(
      { externalId, conversationId, tenantId, conversationStatus },
      'Incoming message processed',
    );
  };
}
