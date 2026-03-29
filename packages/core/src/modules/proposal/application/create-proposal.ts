import { injectable, inject } from 'tsyringe'
import { Proposal } from '../domain/proposal.js'
import type { ProposalRepository } from '../domain/proposal-repository.js'
import type { ChecklistRepository } from '../domain/checklist-repository.js'
import type { ChecklistConfigProvider } from '../domain/checklist-config.js'

interface CreateProposalDTO {
  organizationId: string
  clientId: string
  salespersonId: string
  branch: 'AUTO' | 'RESIDENTIAL' | 'CONDOMINIUM' | 'BUSINESS' | 'LIFE' | 'OTHER'
  boardType: 'NEW_INSURANCE' | 'RENEWAL'
  premiumValueInCents?: number
  commissionPercentageInCents?: number
  renewalPolicyId?: string
  insurerId?: string
}

@injectable()
export class CreateProposal {
  constructor(
    @inject('ProposalRepository')
    private readonly proposalRepo: ProposalRepository,
    @inject('ChecklistRepository')
    private readonly checklistRepo: ChecklistRepository,
    @inject('ChecklistConfigProvider')
    private readonly checklistConfig: ChecklistConfigProvider
  ) {}

  async execute(dto: CreateProposalDTO): Promise<Proposal> {
    const proposal = Proposal.create(dto)
    await this.proposalRepo.save(proposal)

    const items = this.checklistConfig.getItems(proposal.stage, proposal.branch)
    if (items.length > 0) {
      await this.checklistRepo.createMany(
        proposal.id,
        items.map((i) => ({
          itemKey: i.itemKey,
          label: i.label,
          isRequired: i.isRequired,
        }))
      )
    }

    return proposal
  }
}
