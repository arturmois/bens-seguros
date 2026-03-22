import type { NotificationRepository } from '../domain/notification-repository.js'

export class CountUnreadNotifications {
  constructor(private readonly repo: NotificationRepository) {}

  async execute(
    organizationId: string,
    userId: string
  ): Promise<{ count: number }> {
    const count = await this.repo.countUnread(organizationId, userId)
    return { count }
  }
}
