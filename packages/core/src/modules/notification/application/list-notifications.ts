import type { NotificationRepository } from '../domain/notification-repository.js'
import type {
  NotificationData,
  NotificationFilters,
} from '../domain/notification-types.js'

export class ListNotifications {
  constructor(private readonly repo: NotificationRepository) {}

  async execute(filters: NotificationFilters): Promise<{
    data: NotificationData[]
    total?: number
    nextCursor: string | null
  }> {
    return this.repo.findMany(filters)
  }
}
