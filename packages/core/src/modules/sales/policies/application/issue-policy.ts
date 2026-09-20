import { randomUUID } from 'node:crypto'
import { inject, injectable } from 'tsyringe'

import { ClientErrors } from '../../../client/domain/client-errors.js'
import type { ClientRepository } from '../../../client/domain/client-repository.js'
import { CreateCommissionForPolicy } from '../../../commission/application/create-commission-for-policy.js'
import type { ContactRepository } from '../../leads/domain/contact-repository.js'
import { ProposalErrors } from '../../proposals/domain/proposal-errors.js'
import type { ProposalRepository } from '../../proposals/domain/proposal-repository.js' // ProposalRepository lives in sales/proposals;
import { PolicyErrors } from '../domain/policy-errors.js'
import type {
  CoverageDetails,
  PolicyData,
  PolicyRepository,
} from '../domain/policy-repository.js'

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
    @inject('ClientRepository')
    private readonly clientRepo: ClientRepository,
    @inject(CreateCommissionForPolicy)
    private readonly createCommissionForPolicy: CreateCommissionForPolicy
  ) {}

  async execute(dto: IssuePolicyDTO): Promise<PolicyData> {
    const proposal = await this.proposalRepo.findById(
      dto.proposalId,
      dto.organizationId
    )
    if (!proposal) {
      throw ProposalErrors.notFound(dto.proposalId)
    }
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
    const client = await this.clientRepo.findById(
      contact.clientId,
      dto.organizationId
    )
    if (!client) {
      throw ClientErrors.notFound(contact.clientId)
    }
    if (!client.address) {
      throw PolicyErrors.clientAddressMissing(client.id)
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
    await this.createCommissionForPolicy.execute({
      organizationId: dto.organizationId,
      policyId: policy.id,
      salespersonId: proposal.salespersonId,
      premiumValueInCents: proposal.premiumValueInCents,
      commissionPercentageInBasisPoints: proposal.commissionBasisPoints,
    })
    return policy
  }
}
