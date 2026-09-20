export { CountAlertsByEntityType } from './application/count-alerts-by-entity-type.js'
export { CountUnreadNotifications } from './application/count-unread-notifications.js'
export { CreateNotification } from './application/create-notification.js'
export { ListNotifications } from './application/list-notifications.js'
export {
  MarkAllNotificationsAsRead,
  MarkNotificationAsRead,
} from './application/mark-as-read.js'

export type { NotificationDispatcher } from './domain/notification-dispatcher.js'
export { NotificationNotFoundError } from './domain/notification-errors.js'
export type { NotificationRepository } from './domain/notification-repository.js'
export type {
  CreateNotificationInput,
  NotificationData,
  NotificationFilters,
  NotificationJobData,
} from './domain/notification-types.js'

export { PrismaNotificationRepository } from './infrastructure/prisma-notification-repository.js'

export type {
  EmailAttachment,
  EmailPayload,
  EmailProvider,
} from './domain/email-provider.js'
export {
  DEFAULT_FROM_ADDRESS,
  ResendEmailProvider,
} from './infrastructure/resend-email-provider.js'

export {
  baseLayout,
  button,
} from './infrastructure/email-templates/base-layout.js'
export { emailVerificationEmail } from './infrastructure/email-templates/email-verification.js'
export { invitationEmail } from './infrastructure/email-templates/invitation.js'
export { passwordResetEmail } from './infrastructure/email-templates/password-reset.js'
export { policyExpiringEmail } from './infrastructure/email-templates/policy-expiring.js'
export { quoteSentEmailHtml } from './infrastructure/email-templates/quote-sent-email.js'
