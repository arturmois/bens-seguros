import 'reflect-metadata'
import { inject, injectable } from 'tsyringe'

import { ChatErrors } from '../domain/errors.js'
import type { ConversationRepository } from '../domain/ports/conversation-repository.js'
import type { MessageRepository } from '../domain/ports/message-repository.js'
import type { ConversationData } from '../domain/types.js'

interface ReturnToQueueInput {
  readonly conversationId: string
  readonly tenantId: string
}

@injectable()
export class ReturnToQueue {
  constructor(
    @inject('ConversationRepository')
    private readonly conversationRepo: ConversationRepository,
    @inject('MessageRepository')
    private readonly messageRepo: MessageRepository
  ) {}

  async execute(input: ReturnToQueueInput): Promise<ConversationData> {
    const updated = await this.conversationRepo.atomicTransition(
      input.conversationId,
      input.tenantId,
      'HUMAN_ACTIVE',
      'WAITING_HUMAN',
      { assignedTo: null, assignedToName: null }
    )
    if (!updated) {
      throw ChatErrors.invalidTransition(
        'HUMAN_ACTIVE',
        'devolver para fila (não encontrada ou estado alterado concorrentemente)'
      )
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
    })
    return updated
  }
}
