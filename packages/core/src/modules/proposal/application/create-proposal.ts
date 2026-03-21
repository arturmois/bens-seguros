import { injectable, inject } from 'tsyringe';
import { Proposal } from '../domain/proposal.js';
import type { ProposalRepository } from '../domain/proposal-repository.js';

interface CreateProposalDTO {
  organizationId: string;
  clientId: string;
  salespersonId: string;
  branch: 'AUTO' | 'RESIDENTIAL' | 'CONDOMINIUM' | 'BUSINESS' | 'LIFE' | 'OTHER';
  boardType: 'NEW_INSURANCE' | 'RENEWAL';
  premiumValueInCents?: number;
  commissionPercentageInCents?: number;
  renewalPolicyId?: string;
}

@injectable()
export class CreateProposal {
  constructor(@inject('ProposalRepository') private readonly proposalRepo: ProposalRepository) {}

  async execute(dto: CreateProposalDTO): Promise<Proposal> {
    const proposal = Proposal.create(dto);
    await this.proposalRepo.save(proposal);
    return proposal;
  }
}
