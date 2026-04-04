import { Resend } from 'resend'
import type { EmailPayload, EmailProvider } from '../domain/email-provider.js'

interface ResendEmailProviderConfig {
  readonly apiKey: string
  readonly fromAddress: string
}

const DEFAULT_FROM_ADDRESS = 'Bens Seguros <noreply@bens.com.br>'

export class ResendEmailProvider implements EmailProvider {
  private readonly client: Resend
  private readonly fromAddress: string

  constructor(config: ResendEmailProviderConfig) {
    this.client = new Resend(config.apiKey)
    this.fromAddress = config.fromAddress
  }

  async send(payload: EmailPayload): Promise<void> {
    await this.client.emails.send({
      from: this.fromAddress,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      ...(payload.replyTo ? { replyTo: payload.replyTo } : {}),
      ...(payload.attachments?.length
        ? {
            attachments: payload.attachments.map((a) => ({
              filename: a.filename,
              content: a.content,
            })),
          }
        : {}),
    })
  }
}

export { DEFAULT_FROM_ADDRESS }
