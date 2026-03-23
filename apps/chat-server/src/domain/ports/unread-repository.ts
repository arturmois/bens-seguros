export interface UnreadRepository {
  markAsRead(
    tenantId: string,
    conversationId: string,
    userId: string
  ): Promise<void>

  getUnreadCounts(
    tenantId: string,
    userId: string
  ): Promise<ReadonlyArray<{ conversationId: string; count: number }>>

  increment(
    tenantId: string,
    conversationId: string,
    excludeUserId: string
  ): Promise<void>
}
