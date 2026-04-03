import { injectable, inject } from 'tsyringe'
import { Proposal } from '../domain/proposal.js'
import type { ProposalRepository } from '../domain/proposal-repository.js'
import type { ChecklistRepository } from '../domain/checklist-repository.js'
import type { ChecklistConfigProvider } from '../domain/checklist-config.js'
import type { PolicyRepository } from '../../policy/domain/policy-repository.js'
import { ProposalErrors } from '../domain/proposal-errors.js'

interface CreateProposalDTOBase {
  organizationId: string
  salespersonId: string
}

type CreateProposalDTO =
  | (CreateProposalDTOBase & {
      clientId: string
      branch:
        | 'AUTO'
        | 'RESIDENTIAL'
        | 'CONDOMINIUM'
        | 'BUSINESS'
        | 'LIFE'
        | 'OTHER'
      boardType: 'NEW_INSURANCE' | 'RENEWAL'
      premiumValueInCents?: number
      commissionPercentageInCents?: number
      renewalPolicyId?: string
      insurerId?: string
    })
  | (CreateProposalDTOBase & {
      boardType: 'ENDORSEMENT'
      sourcePolicyId: string
      endorsementType: string
      endorsementReason: string
    })

@injectable()
export class CreateProposal {
  constructor(
    @inject('ProposalRepository')
    private readonly proposalRepo: ProposalRepository,
    @inject('ChecklistRepository')
    private readonly checklistRepo: ChecklistRepository,
    @inject('ChecklistConfigProvider')
    private readonly checklistConfig: ChecklistConfigProvider,
    @inject('PolicyRepository')
    private readonly policyRepo: PolicyRepository
  ) {}

  async execute(dto: CreateProposalDTO): Promise<Proposal> {
    const proposal =
      dto.boardType === 'ENDORSEMENT'
        ? await this.createEndorsementProposal(dto)
        : Proposal.create(dto)

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

  private async createEndorsementProposal(
    dto: Extract<CreateProposalDTO, { boardType: 'ENDORSEMENT' }>
  ): Promise<Proposal> {
    if (!dto.sourcePolicyId) {
      throw ProposalErrors.sourcePolicyRequiredForEndorsement()
    }

    const policy = await this.policyRepo.findById(
      dto.sourcePolicyId,
      dto.organizationId
    )

    if (!policy || policy.status !== 'ACTIVE') {
      throw ProposalErrors.sourcePolicyNotEligible(dto.sourcePolicyId)
    }

    return Proposal.create({
      organizationId: dto.organizationId,
      clientId: policy.clientId,
      salespersonId: dto.salespersonId,
      branch: policy.branch,
      boardType: 'ENDORSEMENT',
      sourcePolicyId: policy.id,
      endorsementType: dto.endorsementType,
      endorsementReason: dto.endorsementReason,
      sourcePolicySnapshot: {
        policyNumber: policy.policyNumber,
        clientName: policy.clientName ?? 'Sem cliente',
        startDate: policy.startDate,
        endDate: policy.endDate,
        status: policy.status,
        insurerId: null,
        insurerName: policy.insurerName ?? null,
      },
    })
  }
}
