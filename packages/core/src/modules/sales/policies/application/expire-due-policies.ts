import type { PolicyRepository } from '../domain/policy-repository.js'

export interface ExpireDuePoliciesInput {
  now: Date
}

export class ExpireDuePolicies {
  constructor(
    private readonly policyRepo: Pick<PolicyRepository, 'updateMany'>
  ) {}

  async execute(input: ExpireDuePoliciesInput): Promise<{ count: number }> {
    return this.policyRepo.updateMany({
      where: { status: 'ACTIVE', endDate: { lt: input.now } },
      data: { status: 'EXPIRED' },
    })
  }
}
