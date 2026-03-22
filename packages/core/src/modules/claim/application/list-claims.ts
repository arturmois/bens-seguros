import { injectable, inject } from 'tsyringe'
import type { CursorPage, Page } from '../../client/domain/client-repository.js'
import type {
  ClaimRepository,
  ClaimData,
  ClaimFilters,
} from '../domain/claim-repository.js'

@injectable()
export class ListClaims {
  constructor(
    @inject('ClaimRepository') private readonly claimRepo: ClaimRepository
  ) {}

  async execute(
    filters: ClaimFilters,
    page: CursorPage
  ): Promise<Page<ClaimData>> {
    return this.claimRepo.findMany(filters, page)
  }
}
