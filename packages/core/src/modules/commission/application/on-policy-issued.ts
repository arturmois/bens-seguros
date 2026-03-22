import { inject, injectable } from 'tsyringe'

import type { CommissionRepository } from '../domain/commission-repository.js'
import { Commission } from '../domain/commission.js'

interface PolicyIssuedData {
  organizationId: string
  policyId: string
  salespersonId: string
  premiumValueInCents: number
  commissionPercentageInBasisPoints: number
}

@injectable()
export class OnPolicyIssued {
  constructor(
    @inject('CommissionRepository') private readonly repo: CommissionRepository
  ) {}

  async execute(data: PolicyIssuedData): Promise<void> {
    if (data.commissionPercentageInBasisPoints <= 0) {
      return
    }

    const commission = Commission.create({
      organizationId: data.organizationId,
      policyId: data.policyId,
      salespersonId: data.salespersonId,
      premiumValueInCents: data.premiumValueInCents,
      percentageInBasisPoints: data.commissionPercentageInBasisPoints,
    })

    await this.repo.save(commission)
  }
}
