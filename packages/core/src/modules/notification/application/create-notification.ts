import type { NotificationRepository } from '../domain/notification-repository.js'
import type {
  CreateNotificationInput,
  NotificationData,
} from '../domain/notification-types.js'

export class CreateNotification {
  constructor(private readonly repo: NotificationRepository) {}

  async execute(input: CreateNotificationInput): Promise<NotificationData> {
    return this.repo.create(input)
  }
}
