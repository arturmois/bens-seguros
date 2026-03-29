import 'reflect-metadata'
import { inject, injectable } from 'tsyringe'

import { ChatErrors } from '../domain/errors.js'
import type { ConversationRepository } from '../domain/ports/conversation-repository.js'
import type { ConversationData } from '../domain/types.js'

interface ReturnToBotInput {
  readonly conversationId: string
  readonly tenantId: string
}

@injectable()
export class ReturnToBot {
  constructor(
    @inject('ConversationRepository')
    private readonly conversationRepo: ConversationRepository
  ) {}

  async execute(input: ReturnToBotInput): Promise<ConversationData> {
    const updated = await this.conversationRepo.atomicTransition(
      input.conversationId,
      input.tenantId,
      ['HUMAN_ACTIVE', 'WAITING_HUMAN'],
      'BOT_ACTIVE',
      { assignedTo: null, assignedToName: null }
    )

    if (!updated) {
      throw ChatErrors.invalidTransition(
        'HUMAN_ACTIVE/WAITING_HUMAN',
        'voltar para IA (não encontrada ou estado alterado concorrentemente)'
      )
    }

    return updated
  }
}
