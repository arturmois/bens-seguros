import type { CursorPage, MessageData, MessageStatus, Page } from '../types.js'

export interface MessageRepository {
  create(data: Omit<MessageData, 'id'>): Promise<MessageData>

  findByConversation(
    conversationId: string,
    page: CursorPage
  ): Promise<Page<MessageData>>

  findByExternalId(
    externalId: string,
    tenantId: string
  ): Promise<MessageData | null>

  updateStatus(id: string, status: MessageStatus): Promise<void>

  findAfterTimestamp(
    conversationIds: string[],
    after: Date,
    limit: number
  ): Promise<MessageData[]>
}
