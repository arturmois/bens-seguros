import 'reflect-metadata'
import { inject, injectable } from 'tsyringe'

import { ChatErrors } from '../domain/errors.js'
import type { ContactRepository } from '../domain/ports/contact-repository.js'
import type { ConversationRepository } from '../domain/ports/conversation-repository.js'
import type { MessageRepository } from '../domain/ports/message-repository.js'
import type {
  ContactData,
  ConversationData,
  MessageData,
  Page,
} from '../domain/types.js'

interface GetConversationResult {
  readonly conversation: ConversationData
  readonly messages: Page<MessageData>
  readonly contact: ContactData | null
}

@injectable()
export class GetConversation {
  constructor(
    @inject('ConversationRepository')
    private readonly conversationRepo: ConversationRepository,
    @inject('MessageRepository')
    private readonly messageRepo: MessageRepository,
    @inject('ContactRepository')
    private readonly contactRepo: ContactRepository
  ) {}

  async execute(
    conversationId: string,
    tenantId: string
  ): Promise<GetConversationResult> {
    const conversation = await this.conversationRepo.findById(
      conversationId,
      tenantId
    )

    if (!conversation) {
      throw ChatErrors.conversationNotFound(conversationId)
    }

    const [messages, contact] = await Promise.all([
      this.messageRepo.findByConversation(conversationId, tenantId, {
        limit: 50,
      }),
      this.contactRepo.findById(conversation.contactId, tenantId),
    ])

    return { conversation, messages, contact }
  }
}
