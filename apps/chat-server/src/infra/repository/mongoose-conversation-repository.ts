import { Conversation } from '@repo/db-chat'

import type { ConversationRepository } from '../../domain/ports/conversation-repository.js'
import type {
  ConversationData,
  ConversationFilters,
  ConversationStatus,
  CursorPage,
  Page,
} from '../../domain/types.js'

interface MongooseConversationDoc {
  _id: unknown
  tenantId: string
  channelId: string
  contactId: string
  status: string
  assignedTo?: string | null
  assignedToName?: string | null
  subject?: string | null
  lastMessageText?: string | null
  lastMessageAt?: Date | null
  whatsappPhone?: string | null
  closedAt?: Date | null
  closedBy?: string | null
  createdAt: Date
  updatedAt: Date
}

function toConversationData(doc: MongooseConversationDoc): ConversationData {
  return {
    id: String(doc._id),
    tenantId: doc.tenantId,
    channelId: doc.channelId,
    contactId: doc.contactId,
    status: doc.status as ConversationData['status'],
    assignedTo: doc.assignedTo ?? null,
    assignedToName: doc.assignedToName ?? null,
    subject: doc.subject ?? null,
    lastMessageText: doc.lastMessageText ?? null,
    lastMessageAt: doc.lastMessageAt ?? null,
    whatsappPhone: doc.whatsappPhone ?? null,
    closedAt: doc.closedAt ?? null,
    closedBy: doc.closedBy ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

export class MongooseConversationRepository implements ConversationRepository {
  async findById(
    id: string,
    tenantId: string
  ): Promise<ConversationData | null> {
    const doc = await Conversation.findOne({ _id: id, tenantId }).lean()
    if (!doc) return null
    return toConversationData(doc as unknown as MongooseConversationDoc)
  }

  async findOpenByContactAndChannel(
    tenantId: string,
    contactId: string,
    channelId: string
  ): Promise<ConversationData | null> {
    const doc = await Conversation.findOne({
      tenantId,
      contactId,
      channelId,
      status: { $ne: 'CLOSED' },
    }).lean()
    if (!doc) return null
    return toConversationData(doc as unknown as MongooseConversationDoc)
  }

  async findMany(
    filters: ConversationFilters,
    page: CursorPage
  ): Promise<Page<ConversationData>> {
    const query: Record<string, unknown> = { tenantId: filters.tenantId }

    if (filters.status) {
      query['status'] = filters.status
    }
    if (filters.assignedTo) {
      query['assignedTo'] = filters.assignedTo
    }
    if (filters.search) {
      query['lastMessageText'] = { $regex: filters.search, $options: 'i' }
    }
    if (page.cursor) {
      query['_id'] = { $lt: page.cursor }
    }

    const [docs, total] = await Promise.all([
      Conversation.find(query)
        .sort({ updatedAt: -1, _id: -1 })
        .limit(page.limit)
        .lean(),
      Conversation.countDocuments({
        tenantId: filters.tenantId,
        ...buildCountFilter(filters),
      }),
    ])

    const items = (docs as unknown as MongooseConversationDoc[]).map(
      toConversationData
    )
    const lastItem = items.at(-1)

    return {
      data: items,
      meta: {
        total,
        nextCursor:
          items.length === page.limit && lastItem ? lastItem.id : null,
      },
    }
  }

  async create(data: ConversationData): Promise<ConversationData> {
    const doc = await Conversation.create({
      _id: data.id,
      tenantId: data.tenantId,
      channelId: data.channelId,
      contactId: data.contactId,
      status: data.status,
      assignedTo: data.assignedTo,
      assignedToName: data.assignedToName,
      subject: data.subject,
      lastMessageText: data.lastMessageText,
      lastMessageAt: data.lastMessageAt,
      whatsappPhone: data.whatsappPhone,
      closedAt: data.closedAt,
      closedBy: data.closedBy,
    })

    return toConversationData(
      doc.toObject() as unknown as MongooseConversationDoc
    )
  }

  async updateStatus(
    id: string,
    tenantId: string,
    status: ConversationStatus,
    fields?: Partial<ConversationData>
  ): Promise<ConversationData | null> {
    const updateFields: Record<string, unknown> = { status }

    if (fields?.assignedTo !== undefined)
      updateFields['assignedTo'] = fields.assignedTo
    if (fields?.assignedToName !== undefined)
      updateFields['assignedToName'] = fields.assignedToName
    if (fields?.closedAt !== undefined)
      updateFields['closedAt'] = fields.closedAt
    if (fields?.closedBy !== undefined)
      updateFields['closedBy'] = fields.closedBy

    const doc = await Conversation.findOneAndUpdate(
      { _id: id, tenantId },
      { $set: updateFields },
      { returnDocument: 'after' }
    ).lean()

    if (!doc) return null
    return toConversationData(doc as unknown as MongooseConversationDoc)
  }

  async atomicAssign(
    id: string,
    tenantId: string,
    agentId: string,
    agentName: string
  ): Promise<ConversationData | null> {
    const doc = await Conversation.findOneAndUpdate(
      {
        _id: id,
        tenantId,
        status: 'WAITING_HUMAN',
        assignedTo: { $in: [null, undefined] },
      },
      {
        $set: {
          status: 'HUMAN_ACTIVE',
          assignedTo: agentId,
          assignedToName: agentName,
        },
      },
      { returnDocument: 'after' }
    ).lean()

    if (!doc) return null
    return toConversationData(doc as unknown as MongooseConversationDoc)
  }

  async updateLastMessage(
    id: string,
    tenantId: string,
    text: string,
    timestamp: Date
  ): Promise<void> {
    await Conversation.updateOne(
      { _id: id, tenantId },
      { $set: { lastMessageText: text, lastMessageAt: timestamp } }
    )
  }

  async findStaleConversations(
    olderThan: Date,
    limit: number
  ): Promise<ConversationData[]> {
    const docs = await Conversation.find({
      status: { $in: ['BOT_ACTIVE', 'WAITING_HUMAN', 'HUMAN_ACTIVE'] },
      updatedAt: { $lt: olderThan },
    })
      .limit(limit)
      .lean()

    return (docs as unknown as MongooseConversationDoc[]).map(
      toConversationData
    )
  }
}

function buildCountFilter(
  filters: ConversationFilters
): Record<string, unknown> {
  const countFilter: Record<string, unknown> = {}
  if (filters.status) countFilter['status'] = filters.status
  if (filters.assignedTo) countFilter['assignedTo'] = filters.assignedTo
  if (filters.search)
    countFilter['lastMessageText'] = { $regex: filters.search, $options: 'i' }
  return countFilter
}
