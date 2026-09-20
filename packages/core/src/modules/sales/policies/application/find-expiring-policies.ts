import type { PolicyRepository } from '../domain/policy-repository.js'

export interface FindExpiringPoliciesInput {
  organizationId: string
  now: Date
  thresholds: readonly number[]
}

export interface ExpiringPolicyWindow {
  days: number
  policies: Array<{
    id: string
    policyNumber: string
    salespersonId: string
  }>
}

export class FindExpiringPolicies {
  constructor(
    private readonly policyRepo: Pick<PolicyRepository, 'findExpiring'>
  ) {}

  async execute(
    input: FindExpiringPoliciesInput
  ): Promise<ExpiringPolicyWindow[]> {
    const windows: ExpiringPolicyWindow[] = []
    for (const days of input.thresholds) {
      const targetDate = new Date(input.now)
      targetDate.setDate(targetDate.getDate() + days)
      const startOfDay = new Date(targetDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(targetDate)
      endOfDay.setHours(23, 59, 59, 999)
      const policies = await this.policyRepo.findExpiring({
        organizationId: input.organizationId,
        startOfDay,
        endOfDay,
      })
      windows.push({ days, policies })
    }
    return windows
  }
}
