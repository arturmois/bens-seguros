import type { NotificationJobData } from './notification-types.js'

export interface NotificationDispatcher {
  dispatch(items: readonly NotificationJobData[]): Promise<void>
}
