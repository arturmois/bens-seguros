import 'reflect-metadata'
import { inject, injectable } from 'tsyringe'

import { ConversationEntity } from '../domain/conversation.js'
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
    const existing = await this.conversationRepo.findById(
      input.conversationId,
      input.tenantId
    )

    if (!existing) {
      throw ChatErrors.conversationNotFound(input.conversationId)
    }

    const entity = ConversationEntity.restore(existing)
    entity.returnToBot()

    const updated = await this.conversationRepo.updateStatus(
      input.conversationId,
      input.tenantId,
      'BOT_ACTIVE',
      { assignedTo: null, assignedToName: null }
    )

    if (!updated) {
      throw ChatErrors.conversationNotFound(input.conversationId)
    }

    return updated
  }
}
