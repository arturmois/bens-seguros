import type {
  CommissionData,
  CommissionRepository,
} from '../domain/commission-repository.js'
import { Commission } from '../domain/commission.js'

export interface CreateCommissionForPolicyInput {
  organizationId: string
  policyId: string
  salespersonId: string
  premiumValueInCents: number
  commissionPercentageInBasisPoints: number
}

export class CreateCommissionForPolicy {
  constructor(private readonly repo: CommissionRepository) {}

  async execute(
    data: CreateCommissionForPolicyInput
  ): Promise<CommissionData | null> {
    if (data.commissionPercentageInBasisPoints <= 0) {
      return null
    }
    const existing = await this.repo.findNonReversalByPolicyId(
      data.policyId,
      data.organizationId
    )
    if (existing) {
      return existing
    }
    const commission = Commission.create({
      organizationId: data.organizationId,
      policyId: data.policyId,
      salespersonId: data.salespersonId,
      premiumValueInCents: data.premiumValueInCents,
      percentageInBasisPoints: data.commissionPercentageInBasisPoints,
    })
    return this.repo.save(commission)
  }
}
