// packages/core/src/modules/notification/application/mark-as-read.spec.ts
import { describe, expect, it, vi } from 'vitest'
import type { NotificationRepository } from '../domain/notification-repository.js'
import {
  MarkNotificationAsRead,
  MarkAllNotificationsAsRead,
} from './mark-as-read.js'

function createMockRepo(): NotificationRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findMany: vi.fn(),
    markAsRead: vi.fn().mockResolvedValue(undefined),
    markAllAsRead: vi.fn().mockResolvedValue(5),
    countUnread: vi.fn(),
    countAlertsByEntityType: vi.fn(),
  }
}

describe('MarkNotificationAsRead', () => {
  it('marks single notification as read', async () => {
    const repo = createMockRepo()
    const useCase = new MarkNotificationAsRead(repo)

    await useCase.execute('notif-1', 'org-1', 'user-1')

    expect(repo.markAsRead).toHaveBeenCalledWith('notif-1', 'org-1', 'user-1')
  })
})

describe('MarkAllNotificationsAsRead', () => {
  it('marks all notifications as read and returns count', async () => {
    const repo = createMockRepo()
    const useCase = new MarkAllNotificationsAsRead(repo)

    const result = await useCase.execute('org-1', 'user-1')

    expect(repo.markAllAsRead).toHaveBeenCalledWith('org-1', 'user-1')
    expect(result.count).toBe(5)
  })
})
