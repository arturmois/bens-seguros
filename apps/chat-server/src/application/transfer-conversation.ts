import 'reflect-metadata'
import { inject, injectable } from 'tsyringe'

import { ChatErrors } from '../domain/errors.js'
import type { ConversationRepository } from '../domain/ports/conversation-repository.js'
import type { MessageRepository } from '../domain/ports/message-repository.js'
import type { ConversationData } from '../domain/types.js'

interface TransferConversationInput {
  readonly conversationId: string
  readonly tenantId: string
  readonly targetAgentId: string
  readonly targetAgentName: string
}

@injectable()
export class TransferConversation {
  constructor(
    @inject('ConversationRepository')
    private readonly conversationRepo: ConversationRepository,
    @inject('MessageRepository')
    private readonly messageRepo: MessageRepository
  ) {}

  async execute(input: TransferConversationInput): Promise<ConversationData> {
    if (!input.targetAgentId || !input.targetAgentName) {
      throw ChatErrors.invalidTransition(
        'HUMAN_ACTIVE',
        'transferir sem agente destino'
      )
    }

    const updated = await this.conversationRepo.atomicTransition(
      input.conversationId,
      input.tenantId,
      'HUMAN_ACTIVE',
      'HUMAN_ACTIVE',
      {
        assignedTo: input.targetAgentId,
        assignedToName: input.targetAgentName,
      }
    )

    if (!updated) {
      throw ChatErrors.invalidTransition(
        'HUMAN_ACTIVE',
        'transferir conversa (nao encontrada ou estado alterado concorrentemente)'
      )
    }

    await this.messageRepo.create({
      conversationId: input.conversationId,
      tenantId: input.tenantId,
      senderType: 'SYSTEM',
      senderName: null,
      senderId: null,
      text: `Transferido para ${input.targetAgentName}`,
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
