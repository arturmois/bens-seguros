export class NotificationNotFoundError extends Error {
  readonly code = 'NOTIFICATION_NOT_FOUND'
  constructor(id: string) {
    super(`Notificacao nao encontrada: ${id}`)
    this.name = 'NotificationNotFoundError'
  }
}
