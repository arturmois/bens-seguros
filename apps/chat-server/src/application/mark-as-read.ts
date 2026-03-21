import 'reflect-metadata';
import { injectable } from 'tsyringe';

import { UnreadCount } from '@repo/db-chat';

interface MarkAsReadInput {
  readonly conversationId: string;
  readonly userId: string;
  readonly tenantId: string;
}

@injectable()
export class MarkAsRead {
  async execute(input: MarkAsReadInput): Promise<void> {
    await UnreadCount.findOneAndUpdate(
      {
        tenantId: input.tenantId,
        conversationId: input.conversationId,
        userId: input.userId,
      },
      {
        $set: { count: 0, lastReadAt: new Date() },
      },
      { upsert: true },
    );
  }
}
