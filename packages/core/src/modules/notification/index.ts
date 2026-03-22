export { CountUnreadNotifications } from './application/count-unread-notifications.js'
export { CreateNotification } from './application/create-notification.js'
export { ListNotifications } from './application/list-notifications.js'
export {
  MarkAllNotificationsAsRead,
  MarkNotificationAsRead,
} from './application/mark-as-read.js'

export { NotificationNotFoundError } from './domain/notification-errors.js'
export type { NotificationRepository } from './domain/notification-repository.js'
export type {
  CreateNotificationInput,
  NotificationData,
  NotificationFilters,
  NotificationJobData,
} from './domain/notification-types.js'

export { PrismaNotificationRepository } from './infrastructure/prisma-notification-repository.js'

export type { EmailPayload, EmailProvider } from './domain/email-provider.js'
export {
  DEFAULT_FROM_ADDRESS,
  ResendEmailProvider,
} from './infrastructure/resend-email-provider.js'

export { claimOpenedEmail } from './infrastructure/email-templates/claim-opened.js'
export { commissionApprovedEmail } from './infrastructure/email-templates/commission-approved.js'
export { commissionRejectedEmail } from './infrastructure/email-templates/commission-rejected.js'
export { invitationEmail } from './infrastructure/email-templates/invitation.js'
export { policyExpiringEmail } from './infrastructure/email-templates/policy-expiring.js'
