import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { injectable, inject } from 'tsyringe';

import { ConversationEntity } from '../domain/conversation.js';
import type { ContactRepository } from '../domain/ports/contact-repository.js';
import type { ConversationRepository } from '../domain/ports/conversation-repository.js';
import type { MessageRepository } from '../domain/ports/message-repository.js';
import type { ConversationData, MessageData } from '../domain/types.js';

interface SaveIncomingMessageInput {
  readonly tenantId: string;
  readonly channelId: string;
  readonly whatsappPhone: string;
  readonly pushName: string | null;
  readonly text: string | null;
  readonly type: MessageData['type'];
  readonly mediaUrl: string | null;
  readonly mediaKey: string | null;
  readonly externalId: string | null;
  readonly hasAi: boolean;
}

interface SaveIncomingMessageResult {
  readonly conversation: ConversationData;
  readonly message: MessageData;
  readonly isNewConversation: boolean;
  readonly isDuplicate: boolean;
}

@injectable()
export class SaveIncomingMessage {
  constructor(
    @inject('ConversationRepository')
    private readonly conversationRepo: ConversationRepository,
    @inject('MessageRepository')
    private readonly messageRepo: MessageRepository,
    @inject('ContactRepository')
    private readonly contactRepo: ContactRepository,
  ) {}

  async execute(input: SaveIncomingMessageInput): Promise<SaveIncomingMessageResult> {
    if (input.externalId) {
      const existing = await this.messageRepo.findByExternalId(input.externalId);
      if (existing) {
        const conversation = await this.conversationRepo.findById(
          existing.conversationId,
          input.tenantId,
        );
        return {
          conversation: conversation!,
          message: existing,
          isNewConversation: false,
          isDuplicate: true,
        };
      }
    }

    const contact = await this.contactRepo.upsertByPhone(
      input.tenantId,
      input.whatsappPhone,
      input.pushName ?? undefined,
    );

    const { conversation, isNewConversation } = await this.findOrCreateConversation({
      tenantId: input.tenantId,
      channelId: input.channelId,
      contactId: contact.id,
      whatsappPhone: input.whatsappPhone,
      hasAi: input.hasAi,
    });

    const now = new Date();

    const message = await this.messageRepo.create({
      id: randomUUID(),
      conversationId: conversation.id,
      tenantId: input.tenantId,
      senderType: 'CLIENT',
      senderName: contact.pushName,
      senderId: contact.id,
      text: input.text,
      type: input.type,
      mediaUrl: input.mediaUrl,
      mediaKey: input.mediaKey,
      status: 'DELIVERED',
      metadata: null,
      externalId: input.externalId,
      createdAt: now,
    });

    await this.conversationRepo.updateLastMessage(
      conversation.id,
      input.tenantId,
      input.text ?? '',
      now,
    );

    return {
      conversation: { ...conversation, lastMessageText: input.text, lastMessageAt: now },
      message,
      isNewConversation,
      isDuplicate: false,
    };
  }

  private async findOrCreateConversation(params: {
    tenantId: string;
    channelId: string;
    contactId: string;
    whatsappPhone: string;
    hasAi: boolean;
  }): Promise<{ conversation: ConversationData; isNewConversation: boolean }> {
    const existing = await this.conversationRepo.findOpenByContactAndChannel(
      params.tenantId,
      params.contactId,
      params.channelId,
    );

    if (existing) {
      return { conversation: existing, isNewConversation: false };
    }

    const entity = ConversationEntity.create({
      tenantId: params.tenantId,
      channelId: params.channelId,
      contactId: params.contactId,
      whatsappPhone: params.whatsappPhone,
      hasAi: params.hasAi,
    });

    const created = await this.conversationRepo.create(entity.toJSON());
    return { conversation: created, isNewConversation: true };
  }
}
