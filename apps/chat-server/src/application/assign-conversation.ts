import 'reflect-metadata'
import { inject, injectable } from 'tsyringe'

import { ChatErrors } from '../domain/errors.js'
import type { ConversationRepository } from '../domain/ports/conversation-repository.js'
import type { ConversationData } from '../domain/types.js'

interface AssignConversationInput {
  readonly conversationId: string
  readonly tenantId: string
  readonly agentId: string
  readonly agentName: string
}

@injectable()
export class AssignConversation {
  constructor(
    @inject('ConversationRepository')
    private readonly conversationRepo: ConversationRepository
  ) {}

  async execute(input: AssignConversationInput): Promise<ConversationData> {
    const result = await this.conversationRepo.atomicAssign(
      input.conversationId,
      input.tenantId,
      input.agentId,
      input.agentName
    )

    if (!result) {
      throw ChatErrors.alreadyAssigned(input.conversationId)
    }

    return result
  }
}
