import { inject, injectable } from 'tsyringe'
import type {
  AiUsageRepository,
  ListAiUsageFilters,
  ListAiUsagePagination,
  ListAiUsageResult,
} from '../domain/ai-usage-repository.js'

const MAX_LIMIT = 100

@injectable()
export class ListAiUsageRecords {
  constructor(
    @inject('AiUsageRepository')
    private readonly repository: AiUsageRepository
  ) {}

  async execute(
    filters: ListAiUsageFilters,
    pagination: ListAiUsagePagination
  ): Promise<ListAiUsageResult> {
    if (pagination.limit > MAX_LIMIT) {
      throw new Error(`limit must be <= ${String(MAX_LIMIT)}`)
    }
    return this.repository.list(filters, pagination)
  }
}
