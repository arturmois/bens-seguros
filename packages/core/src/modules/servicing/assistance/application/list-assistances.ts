import { injectable, inject } from 'tsyringe'
import type { CursorPage, Page } from '../../../shared/pagination.js'
import type {
  AssistanceRepository,
  AssistanceData,
  AssistanceFilters,
  AssistanceSortField,
} from '../domain/assistance-repository.js'

@injectable()
export class ListAssistances {
  constructor(
    @inject('AssistanceRepository')
    private readonly assistanceRepo: AssistanceRepository
  ) {}

  async execute(
    filters: AssistanceFilters,
    page: CursorPage<AssistanceSortField>
  ): Promise<Page<AssistanceData>> {
    return this.assistanceRepo.findMany(filters, page)
  }
}
