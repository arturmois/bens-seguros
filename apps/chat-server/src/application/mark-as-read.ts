import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';

import type { UnreadRepository } from '../domain/ports/unread-repository.js';

interface MarkAsReadInput {
  readonly conversationId: string;
  readonly userId: string;
  readonly tenantId: string;
}

@injectable()
export class MarkAsRead {
  constructor(
    @inject('UnreadRepository')
    private readonly unreadRepo: UnreadRepository,
  ) {}

  async execute(input: MarkAsReadInput): Promise<void> {
    await this.unreadRepo.markAsRead(input.tenantId, input.conversationId, input.userId);
  }
}
