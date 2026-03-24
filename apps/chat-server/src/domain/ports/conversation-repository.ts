import type {
  ConversationData,
  ConversationFilters,
  ConversationStatus,
  CursorPage,
  Page,
} from '../types.js'

export interface ConversationRepository {
  findById(id: string, tenantId: string): Promise<ConversationData | null>

  findOpenByContactAndChannel(
    tenantId: string,
    contactId: string,
    channelId: string
  ): Promise<ConversationData | null>

  findMany(
    filters: ConversationFilters,
    page: CursorPage
  ): Promise<Page<ConversationData>>

  create(data: ConversationData): Promise<ConversationData>

  updateStatus(
    id: string,
    tenantId: string,
    status: ConversationStatus,
    fields?: Partial<ConversationData>
  ): Promise<ConversationData | null>

  atomicTransition(
    id: string,
    tenantId: string,
    fromStatus: ConversationStatus | ReadonlyArray<ConversationStatus>,
    toStatus: ConversationStatus,
    fields?: Partial<ConversationData>
  ): Promise<ConversationData | null>

  atomicAssign(
    id: string,
    tenantId: string,
    agentId: string,
    agentName: string
  ): Promise<ConversationData | null>

  updateLastMessage(
    id: string,
    tenantId: string,
    text: string,
    timestamp: Date
  ): Promise<void>

  findStaleConversations(
    olderThan: Date,
    limit: number
  ): Promise<ConversationData[]>
}
