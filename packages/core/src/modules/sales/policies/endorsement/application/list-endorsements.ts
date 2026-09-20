import { injectable, inject } from 'tsyringe'
import type { CursorPage, Page } from '../../../../../shared/pagination.js'
import type {
  EndorsementRepository,
  EndorsementData,
  EndorsementFilters,
} from '../domain/endorsement-repository.js'

@injectable()
export class ListEndorsements {
  constructor(
    @inject('EndorsementRepository')
    private readonly endorsementRepo: EndorsementRepository
  ) {}

  async execute(
    filters: EndorsementFilters,
    page: CursorPage
  ): Promise<Page<EndorsementData>> {
    return this.endorsementRepo.findMany(filters, page)
  }
}
