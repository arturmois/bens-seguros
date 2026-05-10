import { injectable, inject } from 'tsyringe'
import { randomUUID } from 'node:crypto'

import type { OnPolicyIssued } from '../../commission/application/on-policy-issued.js'
import type { ContactRepository } from '../../contact/domain/contact-repository.js'
import type {
  CoverageDetails,
  PolicyData,
  PolicyRepository,
} from '../domain/policy-repository.js'
import type { ProposalRepository } from '../../proposal/domain/proposal-repository.js'
import { ProposalErrors } from '../../proposal/domain/proposal-errors.js'
import { PolicyErrors } from '../domain/policy-errors.js'

interface IssuePolicyDTO {
  organizationId: string
  proposalId: string
  policyNumber: string
  startDate: Date
  endDate: Date
  coverageDetails?: CoverageDetails
  insurerId?: string
}

@injectable()
export class IssuePolicy {
  constructor(
    @inject('PolicyRepository') private readonly policyRepo: PolicyRepository,
    @inject('ProposalRepository')
    private readonly proposalRepo: ProposalRepository,
    @inject('ContactRepository')
    private readonly contactRepo: ContactRepository,
    @inject('OnPolicyIssued') private readonly onPolicyIssued: OnPolicyIssued
  ) {}

  async execute(dto: IssuePolicyDTO): Promise<PolicyData> {
    const proposal = await this.proposalRepo.findByIdOrFail(
      dto.proposalId,
      dto.organizationId
    )
    if (proposal.stage !== 'POLICY_ISSUED') {
      throw PolicyErrors.notIssuable(dto.proposalId)
    }
    const insurerId = dto.insurerId ?? proposal.insurerId
    if (!insurerId) {
      throw PolicyErrors.missingInsurer(dto.proposalId)
    }
    const contact = await this.contactRepo.findById(
      proposal.contactId,
      dto.organizationId
    )
    if (!contact?.clientId) {
      throw ProposalErrors.contactNotPromoted()
    }
    const policy = await this.policyRepo.create({
      id: randomUUID(),
      organizationId: dto.organizationId,
      proposalId: dto.proposalId,
      clientId: contact.clientId,
      salespersonId: proposal.salespersonId,
      insurerId,
      policyNumber: dto.policyNumber,
      status: 'ACTIVE',
      branch: proposal.branch,
      premiumValueInCents: proposal.premiumValueInCents,
      coverageDetails: dto.coverageDetails ?? null,
      startDate: dto.startDate,
      endDate: dto.endDate,
    })
    await this.onPolicyIssued.execute({
      organizationId: dto.organizationId,
      policyId: policy.id,
      salespersonId: proposal.salespersonId,
      premiumValueInCents: proposal.premiumValueInCents,
      commissionPercentageInBasisPoints: proposal.commissionPercentageInCents,
    })
    return policy
  }
}
