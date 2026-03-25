import type { NotificationRepository } from '../domain/notification-repository.js'

const PROACTIVE_ALERT_TYPES = [
  'POLICY_EXPIRING',
  'CLAIM_STALLED',
  'COMMISSION_PENDING',
  'PROPOSAL_STAGNANT',
] as const

export class CountAlertsByEntityType {
  constructor(private readonly repo: NotificationRepository) {}

  async execute(
    organizationId: string,
    userId: string
  ): Promise<Record<string, number>> {
    return this.repo.countAlertsByEntityType(
      organizationId,
      userId,
      PROACTIVE_ALERT_TYPES
    )
  }
}
