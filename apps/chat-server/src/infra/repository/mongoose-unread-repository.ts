import { UnreadCount } from '@repo/db-chat';

import type { UnreadRepository } from '../../domain/ports/unread-repository.js';

export class MongooseUnreadRepository implements UnreadRepository {
  async markAsRead(tenantId: string, conversationId: string, userId: string): Promise<void> {
    await UnreadCount.findOneAndUpdate(
      { tenantId, conversationId, userId },
      { $set: { count: 0, lastReadAt: new Date() } },
      { upsert: true },
    );
  }
}
