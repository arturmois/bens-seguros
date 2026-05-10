import 'reflect-metadata'
import { inject, injectable } from 'tsyringe'

import { ChatErrors } from '../domain/errors.js'
import type { ConversationRepository } from '../domain/ports/conversation-repository.js'
import type { MessageRepository } from '../domain/ports/message-repository.js'
import type { ConversationData } from '../domain/types.js'

interface CloseConversationInput {
  readonly conversationId: string
  readonly tenantId: string
  readonly closedBy: string
  readonly closedByName: string
}

@injectable()
export class CloseConversation {
  constructor(
    @inject('ConversationRepository')
    private readonly conversationRepo: ConversationRepository,
    @inject('MessageRepository')
    private readonly messageRepo: MessageRepository
  ) {}

  async execute(input: CloseConversationInput): Promise<ConversationData> {
    const now = new Date()
    const updated = await this.conversationRepo.atomicTransition(
      input.conversationId,
      input.tenantId,
      ['BOT_ACTIVE', 'WAITING_HUMAN', 'HUMAN_ACTIVE'],
      'CLOSED',
      { closedAt: now, closedBy: input.closedBy }
    )
    if (!updated) {
      throw ChatErrors.invalidTransition(
        'CLOSED',
        'fechar conversa (ja fechada ou estado alterado concorrentemente)'
      )
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
    })
    return updated
  }
}
