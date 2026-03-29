import { Message, type MessageDocument } from '@repo/db-chat'

import type { MessageRepository } from '../../domain/ports/message-repository.js'
import type {
  CursorPage,
  MessageData,
  MessageStatus,
  Page,
} from '../../domain/types.js'

function toMessageData(doc: MessageDocument): MessageData {
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
    metadata: (doc.metadata as Record<string, unknown> | undefined) ?? null,
    externalId: doc.externalId ?? null,
    createdAt: doc.createdAt,
  }
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
    })

    return toMessageData(doc.toObject<MessageDocument>())
  }

  async findByConversation(
    conversationId: string,
    tenantId: string,
    page: CursorPage
  ): Promise<Page<MessageData>> {
    const query: Record<string, unknown> = { conversationId, tenantId }

    if (page.cursor) {
      query['_id'] = { $lt: page.cursor }
    }

    const [docs, total] = await Promise.all([
      Message.find(query)
        .sort({ createdAt: -1, _id: -1 })
        .limit(page.limit)
        .lean<MessageDocument[]>(),
      Message.countDocuments({ conversationId, tenantId }),
    ])

    const items = docs.map(toMessageData)
    const lastItem = items.at(-1)

    // Query fetches newest-first for cursor pagination, but UI needs oldest-first (chronological)
    items.reverse()

    return {
      data: items,
      meta: {
        total,
        nextCursor:
          items.length === page.limit && lastItem ? lastItem.id : null,
      },
    }
  }

  async findByExternalId(
    externalId: string,
    tenantId: string
  ): Promise<MessageData | null> {
    const doc = await Message.findOne({
      externalId,
      tenantId,
    }).lean<MessageDocument>()
    if (!doc) return null
    return toMessageData(doc)
  }

  async updateStatus(
    id: string,
    tenantId: string,
    status: MessageStatus
  ): Promise<void> {
    await Message.updateOne({ _id: id, tenantId }, { $set: { status } })
  }

  async findAfterTimestamp(
    conversationIds: string[],
    tenantId: string,
    after: Date,
    limit: number
  ): Promise<MessageData[]> {
    const docs = await Message.find({
      conversationId: { $in: conversationIds },
      tenantId,
      createdAt: { $gt: after },
    })
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean<MessageDocument[]>()

    return docs.map(toMessageData)
  }
}
