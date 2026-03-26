// packages/core/src/modules/notification/application/count-unread-notifications.spec.ts
import { describe, expect, it, vi } from 'vitest'
import type { NotificationRepository } from '../domain/notification-repository.js'
import { CountUnreadNotifications } from './count-unread-notifications.js'

function createMockRepo(): NotificationRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findMany: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    countUnread: vi.fn().mockResolvedValue(7),
    countAlertsByEntityType: vi.fn(),
  }
}

describe('CountUnreadNotifications', () => {
  it('returns unread notification count', async () => {
    const repo = createMockRepo()
    const useCase = new CountUnreadNotifications(repo)

    const result = await useCase.execute('org-1', 'user-1')

    expect(result).toEqual({ count: 7 })
    expect(repo.countUnread).toHaveBeenCalledWith('org-1', 'user-1')
  })
})
