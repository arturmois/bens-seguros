import { Message } from '@repo/db-chat';

import type { MessageRepository } from '../../domain/ports/message-repository.js';
import type { CursorPage, MessageData, MessageStatus, Page } from '../../domain/types.js';

interface MongooseMessageDoc {
  _id: unknown;
  conversationId: string;
  tenantId: string;
  senderType: string;
  senderName?: string | null;
  senderId?: string | null;
  text?: string | null;
  type: string;
  mediaUrl?: string | null;
  mediaKey?: string | null;
  status: string;
  metadata?: Record<string, unknown> | null;
  externalId?: string | null;
  createdAt: Date;
}

function toMessageData(doc: MongooseMessageDoc): MessageData {
  return {
    id: String(doc._id),
    conversationId: doc.conversationId,
    tenantId: doc.tenantId,
    senderType: doc.senderType as MessageData['senderType'],
    senderName: doc.senderName ?? null,
    senderId: doc.senderId ?? null,
    text: doc.text ?? null,
    type: doc.type as MessageData['type'],
    mediaUrl: doc.mediaUrl ?? null,
    mediaKey: doc.mediaKey ?? null,
    status: doc.status as MessageData['status'],
    metadata: doc.metadata ?? null,
    externalId: doc.externalId ?? null,
    createdAt: doc.createdAt,
  };
}

export class MongooseMessageRepository implements MessageRepository {
  async create(data: Omit<MessageData, 'id'>): Promise<MessageData> {
    const doc = await Message.create({
      conversationId: data.conversationId,
      tenantId: data.tenantId,
      senderType: data.senderType,
      senderName: data.senderName,
      senderId: data.senderId,
      text: data.text,
      type: data.type,
      mediaUrl: data.mediaUrl,
      mediaKey: data.mediaKey,
      status: data.status,
      metadata: data.metadata,
      externalId: data.externalId,
    });

    return toMessageData(doc.toObject() as unknown as MongooseMessageDoc);
  }

  async findByConversation(conversationId: string, page: CursorPage): Promise<Page<MessageData>> {
    const query: Record<string, unknown> = { conversationId };

    if (page.cursor) {
      query['_id'] = { $lt: page.cursor };
    }

    const [docs, total] = await Promise.all([
      Message.find(query).sort({ createdAt: -1, _id: -1 }).limit(page.limit).lean(),
      Message.countDocuments({ conversationId }),
    ]);

    const items = (docs as unknown as MongooseMessageDoc[]).map(toMessageData);
    const lastItem = items.at(-1);

    return {
      data: items,
      meta: {
        total,
        nextCursor: items.length === page.limit && lastItem ? lastItem.id : null,
      },
    };
  }

  async findByExternalId(externalId: string, tenantId: string): Promise<MessageData | null> {
    const doc = await Message.findOne({ externalId, tenantId }).lean();
    if (!doc) return null;
    return toMessageData(doc as unknown as MongooseMessageDoc);
  }

  async updateStatus(id: string, status: MessageStatus): Promise<void> {
    await Message.updateOne({ _id: id }, { $set: { status } });
  }

  async findAfterTimestamp(
    conversationIds: string[],
    after: Date,
    limit: number,
  ): Promise<MessageData[]> {
    const docs = await Message.find({
      conversationId: { $in: conversationIds },
      createdAt: { $gt: after },
    })
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean();

    return (docs as unknown as MongooseMessageDoc[]).map(toMessageData);
  }
}
