import type { CommissionRepository } from '../domain/commission-repository.js'

export interface FindPendingCommissionsInput {
  organizationId: string
  now: Date
  days: number
}

export interface PendingCommissionAlert {
  id: string
  salespersonId: string
  createdAt: Date
  policyNumber: string
}

export class FindPendingCommissions {
  constructor(
    private readonly commissionRepo: Pick<
      CommissionRepository,
      'findPendingCommercial'
    >
  ) {}

  async execute(
    input: FindPendingCommissionsInput
  ): Promise<PendingCommissionAlert[]> {
    const createdBefore = new Date(input.now)
    createdBefore.setDate(createdBefore.getDate() - input.days)
    return this.commissionRepo.findPendingCommercial({
      organizationId: input.organizationId,
      createdBefore,
    })
  }
}
