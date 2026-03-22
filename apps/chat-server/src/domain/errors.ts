export class ConversationNotFoundError extends Error {
  readonly code = 'CONVERSATION_NOT_FOUND' as const
  constructor(id: string) {
    super(`Conversa ${id} não encontrada`)
    this.name = 'ConversationNotFoundError'
  }
}

export class InvalidConversationTransitionError extends Error {
  readonly code = 'INVALID_CONVERSATION_TRANSITION' as const
  constructor(from: string, action: string) {
    super(`Não é possível ${action} a partir do status ${from}`)
    this.name = 'InvalidConversationTransitionError'
  }
}

export class ConversationAlreadyAssignedError extends Error {
  readonly code = 'CONVERSATION_ALREADY_ASSIGNED' as const
  constructor(id: string) {
    super(`Conversa ${id} já está atribuída a um agente`)
    this.name = 'ConversationAlreadyAssignedError'
  }
}

export class ContactNotFoundError extends Error {
  readonly code = 'CONTACT_NOT_FOUND' as const
  constructor(id: string) {
    super(`Contato ${id} não encontrado`)
    this.name = 'ContactNotFoundError'
  }
}

export class ChannelNotFoundError extends Error {
  readonly code = 'CHANNEL_NOT_FOUND' as const
  constructor(id: string) {
    super(`Canal ${id} não encontrado`)
    this.name = 'ChannelNotFoundError'
  }
}

export const ChatErrors = {
  conversationNotFound: (id: string): ConversationNotFoundError =>
    new ConversationNotFoundError(id),
  invalidTransition: (
    from: string,
    action: string
  ): InvalidConversationTransitionError =>
    new InvalidConversationTransitionError(from, action),
  alreadyAssigned: (id: string): ConversationAlreadyAssignedError =>
    new ConversationAlreadyAssignedError(id),
  contactNotFound: (id: string): ContactNotFoundError =>
    new ContactNotFoundError(id),
  channelNotFound: (id: string): ChannelNotFoundError =>
    new ChannelNotFoundError(id),
}
