import 'reflect-metadata'
import { inject, injectable } from 'tsyringe'

import type { ConversationRepository } from '../domain/ports/conversation-repository.js'
import type {
  ConversationData,
  ConversationFilters,
  CursorPage,
  Page,
} from '../domain/types.js'

@injectable()
export class ListConversations {
  constructor(
    @inject('ConversationRepository')
    private readonly conversationRepo: ConversationRepository
  ) {}

  async execute(
    filters: ConversationFilters,
    page: CursorPage
  ): Promise<Page<ConversationData>> {
    return this.conversationRepo.findMany(filters, page)
  }
}
