// packages/core/src/modules/notification/application/create-notification.spec.ts
import { describe, expect, it, vi } from 'vitest'
import type { NotificationRepository } from '../domain/notification-repository.js'
import { CreateNotification } from './create-notification.js'

function createMockRepo(): NotificationRepository {
  return {
    create: vi.fn().mockImplementation(async (input) => ({
      id: 'notif-1',
      ...input,
      read: false,
      readAt: null,
      emailSent: false,
      createdAt: new Date(),
    })),
    findById: vi.fn(),
    findMany: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    countUnread: vi.fn(),
    countAlertsByEntityType: vi.fn(),
  }
}

describe('CreateNotification', () => {
  it('creates notification with correct data', async () => {
    const repo = createMockRepo()
    const useCase = new CreateNotification(repo)

    const result = await useCase.execute({
      organizationId: 'org-1',
      userId: 'user-1',
      type: 'POLICY_EXPIRING',
      title: 'Apólice vence em 7 dias',
      body: 'A apólice pol-1 vence em 7 dias',
      entityType: 'Policy',
      entityId: 'pol-1',
    })

    expect(repo.create).toHaveBeenCalledWith({
      organizationId: 'org-1',
      userId: 'user-1',
      type: 'POLICY_EXPIRING',
      title: 'Apólice vence em 7 dias',
      body: 'A apólice pol-1 vence em 7 dias',
      entityType: 'Policy',
      entityId: 'pol-1',
    })
    expect(result.id).toBe('notif-1')
  })
})
