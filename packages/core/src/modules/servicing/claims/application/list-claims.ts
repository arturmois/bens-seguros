import { inject, injectable } from 'tsyringe'
import type { CursorPage, Page } from '../../../../shared/pagination.js'
import type {
  ClaimData,
  ClaimFilters,
  ClaimRepository,
  ClaimSortField,
} from '../domain/claim-repository.js'

@injectable()
export class ListClaims {
  constructor(
    @inject('ClaimRepository') private readonly claimRepo: ClaimRepository
  ) {}

  async execute(
    filters: ClaimFilters,
    page: CursorPage<ClaimSortField>
  ): Promise<Page<ClaimData>> {
    return this.claimRepo.findMany(filters, page)
  }
}
