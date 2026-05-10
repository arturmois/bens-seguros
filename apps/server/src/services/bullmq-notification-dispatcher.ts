import type { NotificationDispatcher, NotificationJobData } from '@repo/core'
import { enqueueNotifications } from './notification-enqueuer.js'

export class BullmqNotificationDispatcher implements NotificationDispatcher {
  async dispatch(items: readonly NotificationJobData[]): Promise<void> {
    if (items.length === 0) return
    await enqueueNotifications([...items])
  }
}
