// packages/core/src/modules/notification/application/count-alerts-by-entity-type.spec.ts
import { describe, expect, it, vi } from 'vitest'
import type { NotificationRepository } from '../domain/notification-repository.js'
import { CountAlertsByEntityType } from './count-alerts-by-entity-type.js'

function createMockRepo(): NotificationRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findMany: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    countUnread: vi.fn(),
    countAlertsByEntityType: vi.fn().mockResolvedValue({
      Policy: 3,
      Claim: 1,
      Commission: 0,
      Proposal: 2,
    }),
  }
}

describe('CountAlertsByEntityType', () => {
  it('returns alert counts grouped by entity type', async () => {
    const repo = createMockRepo()
    const useCase = new CountAlertsByEntityType(repo)

    const result = await useCase.execute('org-1', 'user-1')

    expect(result).toEqual({
      Policy: 3,
      Claim: 1,
      Commission: 0,
      Proposal: 2,
    })
    expect(repo.countAlertsByEntityType).toHaveBeenCalledWith(
      'org-1',
      'user-1',
      [
        'POLICY_EXPIRING',
        'CLAIM_STALLED',
        'COMMISSION_PENDING',
        'PROPOSAL_STAGNANT',
      ]
    )
  })
})
