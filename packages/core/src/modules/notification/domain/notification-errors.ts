export class NotificationNotFoundError extends Error {
  readonly code = 'NOTIFICATION_NOT_FOUND'
  constructor(id: string) {
    super(`Notificação não encontrada: ${id}`)
    this.name = 'NotificationNotFoundError'
  }
}
