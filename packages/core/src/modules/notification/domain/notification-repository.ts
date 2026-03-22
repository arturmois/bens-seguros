import type {
  CreateNotificationInput,
  NotificationData,
  NotificationFilters,
} from './notification-types.js'

export interface NotificationRepository {
  create(input: CreateNotificationInput): Promise<NotificationData>
  findById(id: string, organizationId: string): Promise<NotificationData | null>
  findMany(filters: NotificationFilters): Promise<{
    data: NotificationData[]
    total: number
    nextCursor: string | null
  }>
  markAsRead(id: string, organizationId: string, userId: string): Promise<void>
  markAllAsRead(organizationId: string, userId: string): Promise<number>
  countUnread(organizationId: string, userId: string): Promise<number>
}
