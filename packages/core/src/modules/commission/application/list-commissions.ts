import { inject, injectable } from 'tsyringe'
import type { CursorPage, Page } from '../../../shared/pagination.js'
import type {
  CommissionData,
  CommissionFilters,
  CommissionRepository,
  CommissionSortField,
} from '../domain/commission-repository.js'

@injectable()
export class ListCommissions {
  constructor(
    @inject('CommissionRepository')
    private readonly commissionRepo: CommissionRepository
  ) {}

  async execute(
    filters: CommissionFilters,
    page: CursorPage<CommissionSortField>
  ): Promise<Page<CommissionData>> {
    return this.commissionRepo.findMany(filters, page)
  }
}
