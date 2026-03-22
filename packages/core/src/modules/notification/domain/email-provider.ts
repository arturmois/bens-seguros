export interface EmailPayload {
  readonly to: string
  readonly subject: string
  readonly html: string
}

export interface EmailProvider {
  send(payload: EmailPayload): Promise<void>
}
