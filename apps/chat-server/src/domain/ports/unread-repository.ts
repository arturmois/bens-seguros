export interface UnreadRepository {
  markAsRead(
    tenantId: string,
    conversationId: string,
    userId: string
  ): Promise<void>
}
