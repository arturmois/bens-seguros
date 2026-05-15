import pino from 'pino'
import { injectable, inject } from 'tsyringe'
import { Proposal } from '../domain/proposal.js'
import type { ProposalRepository } from '../domain/proposal-repository.js'
import type { ChecklistRepository } from '../domain/checklist-repository.js'
import type { ChecklistConfigProvider } from '../domain/checklist-config.js'
import type { PolicyRepository } from '../../policy/domain/policy-repository.js'
import type { ContactRepository } from '../../contact/domain/contact-repository.js'
import { ProposalErrors } from '../domain/proposal-errors.js'
import { AutoCompleteChecklistItems } from './auto-complete-checklist-items.js'

const logger = pino({ name: 'create-proposal' })

interface CreateProposalDTOBase {
  organizationId: string
  salespersonId: string
}

type CreateProposalDTO =
  | (CreateProposalDTOBase & {
      contactId: string
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
      renewalPolicyNumber?: string
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
    private readonly policyRepo: PolicyRepository,
    @inject('ContactRepository')
    private readonly contactRepo: ContactRepository,
    @inject(AutoCompleteChecklistItems)
    private readonly autoComplete: AutoCompleteChecklistItems
  ) {}

  async execute(dto: CreateProposalDTO): Promise<Proposal> {
    const proposal =
      dto.boardType === 'ENDORSEMENT'
        ? await this.createEndorsementProposal(dto)
        : await this.createRenewalOrNewProposal(dto)
    if (!proposal.quoteValidUntil) {
      const validity = new Date(proposal.createdAt)
      validity.setDate(validity.getDate() + 15)
      proposal.updateQuoteValidity(validity)
    }
    await this.proposalRepo.save(proposal)
    const items = this.checklistConfig.getItems(proposal.stage, proposal.branch)
    if (items.length > 0) {
      await this.checklistRepo.createMany(
        proposal.id,
        proposal.organizationId,
        items.map((i) => ({
          itemKey: i.itemKey,
          label: i.label,
          isRequired: i.isRequired,
        }))
      )
      await this.runInitialAutoDetection(proposal)
    }
    return proposal
  }

  private async runInitialAutoDetection(proposal: Proposal): Promise<void> {
    const autoKeys = [
      'client_data',
      'driver_license',
      'vehicle_registration',
    ] as const
    for (const itemKey of autoKeys) {
      try {
        await this.autoComplete.execute({
          organizationId: proposal.organizationId,
          proposalId: proposal.id,
          itemKey,
        })
      } catch (error) {
        logger.warn(
          { err: error, proposalId: proposal.id, itemKey },
          'Auto-detect inicial falhou'
        )
      }
    }
  }

  private async createRenewalOrNewProposal(
    dto: Extract<CreateProposalDTO, { boardType: 'NEW_INSURANCE' | 'RENEWAL' }>
  ): Promise<Proposal> {
    let resolvedPolicyId = dto.renewalPolicyId ?? null
    if (
      dto.boardType === 'RENEWAL' &&
      dto.renewalPolicyNumber &&
      !resolvedPolicyId
    ) {
      const found = await this.policyRepo.findByPolicyNumber(
        dto.renewalPolicyNumber,
        dto.organizationId
      )
      if (found) {
        resolvedPolicyId = found.id
      }
    }
    return Proposal.create({
      ...dto,
      renewalPolicyId: resolvedPolicyId ?? undefined,
      renewalPolicyNumber: dto.renewalPolicyNumber,
    })
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
    const contactId = await this.resolveEndorsementContactId(
      policy.clientId,
      dto.organizationId
    )
    return Proposal.create({
      organizationId: dto.organizationId,
      contactId,
      salespersonId: dto.salespersonId,
      branch: policy.branch,
      boardType: 'ENDORSEMENT',
      sourcePolicyId: policy.id,
      endorsementType: dto.endorsementType,
      endorsementReason: dto.endorsementReason,
      insurerId: policy.insurerId,
      sourcePolicySnapshot: {
        policyNumber: policy.policyNumber,
        clientName: policy.clientName ?? 'Sem cliente',
        startDate: policy.startDate,
        endDate: policy.endDate,
        status: policy.status,
        insurerId: policy.insurerId,
        insurerName: policy.insurerName ?? null,
      },
    })
  }

  private async resolveEndorsementContactId(
    clientId: string,
    organizationId: string
  ): Promise<string> {
    const contacts = await this.contactRepo.findMany(
      { organizationId, clientId },
      { limit: 1, sortBy: 'createdAt', sortOrder: 'asc' }
    )
    const oldest = contacts.items.at(0)
    if (!oldest) {
      throw ProposalErrors.endorsementContactNotFound(clientId)
    }
    return oldest.id
  }
}
