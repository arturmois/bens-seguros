import { injectable, inject } from 'tsyringe'
import type { CursorPage, Page } from '../../client/domain/client-repository.js'
import type {
  AssistanceRepository,
  AssistanceData,
  AssistanceFilters,
} from '../domain/assistance-repository.js'

@injectable()
export class ListAssistances {
  constructor(
    @inject('AssistanceRepository')
    private readonly assistanceRepo: AssistanceRepository
  ) {}

  async execute(
    filters: AssistanceFilters,
    page: CursorPage
  ): Promise<Page<AssistanceData>> {
    return this.assistanceRepo.findMany(filters, page)
  }
}
