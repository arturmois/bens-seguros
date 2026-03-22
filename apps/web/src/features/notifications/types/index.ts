export interface NotificationData {
  readonly id: string
  readonly organizationId: string
  readonly userId: string
  readonly type: string
  readonly title: string
  readonly body: string
  readonly entityType: string | null
  readonly entityId: string | null
  readonly read: boolean
  readonly readAt: string | null
  readonly emailSent: boolean
  readonly createdAt: string
}

export interface NotificationListMeta {
  readonly total: number
  readonly nextCursor: string | null
}
