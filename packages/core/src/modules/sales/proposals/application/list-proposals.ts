import { injectable, inject } from 'tsyringe'
import type { ProposalListPage } from '../domain/proposal-list-item.js'
import type {
  ProposalCursorPage,
  ProposalFilters,
  ProposalRepository,
} from '../domain/proposal-repository.js'

@injectable()
export class ListProposals {
  constructor(
    @inject('ProposalRepository')
    private readonly proposalRepo: ProposalRepository
  ) {}

  async execute(
    filters: ProposalFilters,
    page: ProposalCursorPage
  ): Promise<ProposalListPage> {
    return this.proposalRepo.listForView(filters, page)
  }
}
