import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';

import { ConversationEntity } from '../domain/conversation.js';
import { ChatErrors } from '../domain/errors.js';
import type { ConversationRepository } from '../domain/ports/conversation-repository.js';
import type { MessageRepository } from '../domain/ports/message-repository.js';
import type { ConversationData } from '../domain/types.js';

interface CloseConversationInput {
  readonly conversationId: string;
  readonly tenantId: string;
  readonly closedBy: string;
  readonly closedByName: string;
}

@injectable()
export class CloseConversation {
  constructor(
    @inject('ConversationRepository')
    private readonly conversationRepo: ConversationRepository,
    @inject('MessageRepository')
    private readonly messageRepo: MessageRepository,
  ) {}

  async execute(input: CloseConversationInput): Promise<ConversationData> {
    const existing = await this.conversationRepo.findById(input.conversationId, input.tenantId);

    if (!existing) {
      throw ChatErrors.conversationNotFound(input.conversationId);
    }

    const entity = ConversationEntity.restore(existing);
    entity.close(input.closedBy);

    const now = new Date();

    const updated = await this.conversationRepo.updateStatus(
      input.conversationId,
      input.tenantId,
      'CLOSED',
      { closedAt: now, closedBy: input.closedBy },
    );

    if (!updated) {
      throw ChatErrors.conversationNotFound(input.conversationId);
    }

    await this.messageRepo.create({
      conversationId: input.conversationId,
      tenantId: input.tenantId,
      senderType: 'SYSTEM',
      senderName: null,
      senderId: null,
      text: `Atendimento finalizado por ${input.closedByName}`,
      type: 'TEXT',
      mediaUrl: null,
      mediaKey: null,
      status: 'DELIVERED',
      metadata: null,
      externalId: null,
      createdAt: now,
    });

    return updated;
  }
}
