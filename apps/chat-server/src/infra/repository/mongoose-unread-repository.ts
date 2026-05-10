import { UnreadCount } from '@repo/db-chat'

import type { UnreadRepository } from '../../domain/ports/unread-repository.js'

export class MongooseUnreadRepository implements UnreadRepository {
  async markAsRead(
    tenantId: string,
    conversationId: string,
    userId: string
  ): Promise<void> {
    await UnreadCount.findOneAndUpdate(
      { tenantId, conversationId, userId },
      { $set: { count: 0, lastReadAt: new Date() } },
      { upsert: true }
    )
  }

  async getUnreadCounts(
    tenantId: string,
    userId: string
  ): Promise<ReadonlyArray<{ conversationId: string; count: number }>> {
    const results = await UnreadCount.find(
      { tenantId, userId, count: { $gt: 0 } },
      { conversationId: 1, count: 1, _id: 0 }
    )
      .lean()
      .exec()
    return results.map((r) => ({
      conversationId: String(r.conversationId),
      count: r.count,
    }))
  }

  async increment(
    tenantId: string,
    conversationId: string,
    excludeUserId: string
  ): Promise<void> {
    await UnreadCount.updateMany(
      { tenantId, conversationId, userId: { $ne: excludeUserId } },
      { $inc: { count: 1 } }
    ).exec()
  }
}
