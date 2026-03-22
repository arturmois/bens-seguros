import type { CreateNotificationInput } from '../domain/notification-types.js'

export interface NotificationJobPayload {
  readonly notification: CreateNotificationInput
  readonly email?: {
    readonly to: string
    readonly subject: string
    readonly html: string
  }
}

export interface NotificationQueue {
  add(name: string, data: NotificationJobPayload): Promise<void>
}
