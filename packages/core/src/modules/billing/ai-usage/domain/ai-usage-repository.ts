import type { AiUsageRecord } from './ai-usage-record.js'

export interface ListAiUsageFilters {
  readonly organizationId: string
  readonly periodKey?: string
}

export interface ListAiUsagePagination {
  readonly limit: number
  readonly cursor?: string
}

export interface ListAiUsageResult {
  readonly items: readonly AiUsageRecord[]
  readonly nextCursor: string | null
}

export interface AiUsageRepository {
  create(record: AiUsageRecord): Promise<void>
  list(
    filters: ListAiUsageFilters,
    pagination: ListAiUsagePagination
  ): Promise<ListAiUsageResult>
}
