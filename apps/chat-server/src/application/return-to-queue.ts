import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';

import { ConversationEntity } from '../domain/conversation.js';
import { ChatErrors } from '../domain/errors.js';
import type { ConversationRepository } from '../domain/ports/conversation-repository.js';
import type { MessageRepository } from '../domain/ports/message-repository.js';
import type { ConversationData } from '../domain/types.js';

interface ReturnToQueueInput {
  readonly conversationId: string;
  readonly tenantId: string;
}

@injectable()
export class ReturnToQueue {
  constructor(
    @inject('ConversationRepository')
    private readonly conversationRepo: ConversationRepository,
    @inject('MessageRepository')
    private readonly messageRepo: MessageRepository,
  ) {}

  async execute(input: ReturnToQueueInput): Promise<ConversationData> {
    const existing = await this.conversationRepo.findById(input.conversationId, input.tenantId);

    if (!existing) {
      throw ChatErrors.conversationNotFound(input.conversationId);
    }

    const entity = ConversationEntity.restore(existing);
    entity.returnToQueue();

    const updated = await this.conversationRepo.updateStatus(
      input.conversationId,
      input.tenantId,
      'WAITING_HUMAN',
      { assignedTo: null, assignedToName: null },
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
      text: 'Devolvido para fila',
      type: 'TEXT',
      mediaUrl: null,
      mediaKey: null,
      status: 'DELIVERED',
      metadata: null,
      externalId: null,
      createdAt: new Date(),
    });

    return updated;
  }
}
