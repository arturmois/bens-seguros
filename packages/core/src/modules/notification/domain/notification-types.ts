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
  readonly readAt: Date | null
  readonly emailSent: boolean
  readonly createdAt: Date
}

export interface CreateNotificationInput {
  readonly organizationId: string
  readonly userId: string
  readonly type: string
  readonly title: string
  readonly body: string
  readonly entityType?: string
  readonly entityId?: string
}

export interface NotificationFilters {
  readonly organizationId: string
  readonly userId: string
  readonly read?: boolean
  readonly cursor?: string
  readonly limit?: number
}

export interface NotificationJobData {
  readonly notification: CreateNotificationInput
  readonly email?: {
    readonly to: string
    readonly subject: string
    readonly html: string
  }
}
