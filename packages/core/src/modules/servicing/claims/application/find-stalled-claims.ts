import type {
  ClaimRepository,
  ClaimStatus,
} from '../domain/claim-repository.js'

export interface FindStalledClaimsInput {
  organizationId: string
  now: Date
  days: number
}

export interface StalledClaimAlert {
  id: string
  assignedToId: string | null
  updatedAt: Date
  claimNumber: number
}

const STALLED_STATUSES: readonly ClaimStatus[] = [
  'REGISTERED',
  'IN_ANALYSIS',
  'AWAITING_DOCUMENT',
  'PENDING_INSPECTION',
]

export class FindStalledClaims {
  constructor(
    private readonly claimRepo: Pick<ClaimRepository, 'findStalled'>
  ) {}

  async execute(input: FindStalledClaimsInput): Promise<StalledClaimAlert[]> {
    const updatedBefore = new Date(input.now)
    updatedBefore.setDate(updatedBefore.getDate() - input.days)
    return this.claimRepo.findStalled({
      organizationId: input.organizationId,
      updatedBefore,
      statuses: STALLED_STATUSES,
    })
  }
}
