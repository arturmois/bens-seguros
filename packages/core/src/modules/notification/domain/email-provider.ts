export interface EmailAttachment {
  readonly filename: string
  readonly content: Buffer
}

export interface EmailPayload {
  readonly to: string
  readonly subject: string
  readonly html: string
  readonly replyTo?: string
  readonly attachments?: readonly EmailAttachment[]
}

export interface EmailProvider {
  send(payload: EmailPayload): Promise<void>
}
