import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { injectable, inject } from 'tsyringe';

import { CHAT_QUEUES } from '@repo/shared';

import { ChatErrors } from '../domain/errors.js';
import type { ConversationRepository } from '../domain/ports/conversation-repository.js';
import type { MessageRepository } from '../domain/ports/message-repository.js';
import type { MessageData, SenderType } from '../domain/types.js';

export interface QueueProducer {
  enqueue(queueName: string, data: Record<string, unknown>): Promise<void>;
}

interface SendMessageInput {
  readonly tenantId: string;
  readonly conversationId: string;
  readonly senderId: string;
  readonly senderName: string;
  readonly senderType: SenderType;
  readonly text: string;
}

@injectable()
export class SendMessage {
  constructor(
    @inject('ConversationRepository')
    private readonly conversationRepo: ConversationRepository,
    @inject('MessageRepository')
    private readonly messageRepo: MessageRepository,
    @inject('QueueProducer')
    private readonly queueProducer: QueueProducer,
  ) {}

  async execute(input: SendMessageInput): Promise<MessageData> {
    const conversation = await this.conversationRepo.findById(input.conversationId, input.tenantId);

    if (!conversation) {
      throw ChatErrors.conversationNotFound(input.conversationId);
    }

    const now = new Date();

    const message = await this.messageRepo.create({
      id: randomUUID(),
      conversationId: input.conversationId,
      tenantId: input.tenantId,
      senderType: input.senderType,
      senderName: input.senderName,
      senderId: input.senderId,
      text: input.text,
      type: 'TEXT',
      mediaUrl: null,
      mediaKey: null,
      status: 'PENDING',
      metadata: null,
      externalId: null,
      createdAt: now,
    });

    await this.queueProducer.enqueue(CHAT_QUEUES.SEND_MESSAGE, {
      messageId: message.id,
      conversationId: conversation.id,
      channelId: conversation.channelId,
      tenantId: input.tenantId,
      to: conversation.whatsappPhone,
      text: input.text,
      type: 'TEXT',
    });

    await this.conversationRepo.updateLastMessage(conversation.id, input.tenantId, input.text, now);

    return message;
  }
}
