import { injectable, inject } from 'tsyringe';
import type {
  ProposalRepository,
  ProposalFilters,
  ProposalCursorPage,
  ProposalPage,
} from '../domain/proposal-repository.js';

@injectable()
export class ListProposals {
  constructor(@inject('ProposalRepository') private readonly proposalRepo: ProposalRepository) {}

  async execute(filters: ProposalFilters, page: ProposalCursorPage): Promise<ProposalPage> {
    return this.proposalRepo.findMany(filters, page);
  }
}
