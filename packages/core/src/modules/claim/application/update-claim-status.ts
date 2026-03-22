import { injectable, inject } from 'tsyringe'
import type {
  ClaimRepository,
  ClaimData,
  ClaimStatus,
} from '../domain/claim-repository.js'
import { ClaimErrors } from '../domain/claim-errors.js'

const VALID_TRANSITIONS: Record<ClaimStatus, readonly ClaimStatus[]> = {
  REGISTERED: ['IN_ANALYSIS'],
  IN_ANALYSIS: [
    'AWAITING_DOCUMENT',
    'PENDING_INSPECTION',
    'APPROVED',
    'REJECTED',
  ],
  AWAITING_DOCUMENT: ['IN_ANALYSIS'],
  PENDING_INSPECTION: ['APPROVED', 'REJECTED'],
  APPROVED: ['PAID'],
  REJECTED: [],
  PAID: ['COMPLETED'],
  COMPLETED: [],
} as const

@injectable()
export class UpdateClaimStatus {
  constructor(
    @inject('ClaimRepository') private readonly claimRepo: ClaimRepository
  ) {}

  async execute(
    id: string,
    organizationId: string,
    newStatus: ClaimStatus
  ): Promise<ClaimData> {
    const claim = await this.claimRepo.findById(id, organizationId)
    if (!claim) {
      throw ClaimErrors.notFound(id)
    }

    const allowed = VALID_TRANSITIONS[claim.status]
    if (!allowed.includes(newStatus)) {
      throw ClaimErrors.invalidTransition(claim.status, newStatus)
    }

    const now = new Date()
    const resolvedAt =
      newStatus === 'APPROVED' || newStatus === 'REJECTED' ? now : undefined
    const closedAt = newStatus === 'COMPLETED' ? now : undefined

    return this.claimRepo.updateStatus(id, organizationId, {
      status: newStatus,
      resolvedAt,
      closedAt,
    })
  }
}
