import type { NotificationRepository } from '../domain/notification-repository.js'

export class MarkNotificationAsRead {
  constructor(private readonly repo: NotificationRepository) {}

  async execute(
    id: string,
    organizationId: string,
    userId: string
  ): Promise<void> {
    await this.repo.markAsRead(id, organizationId, userId)
  }
}

export class MarkAllNotificationsAsRead {
  constructor(private readonly repo: NotificationRepository) {}

  async execute(
    organizationId: string,
    userId: string
  ): Promise<{ count: number }> {
    const count = await this.repo.markAllAsRead(organizationId, userId)
    return { count }
  }
}
