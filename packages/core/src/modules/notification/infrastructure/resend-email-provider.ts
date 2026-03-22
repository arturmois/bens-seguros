import { Resend } from 'resend'
import type { EmailPayload, EmailProvider } from '../domain/email-provider.js'

export class ResendEmailProvider implements EmailProvider {
  private readonly client: Resend

  constructor(apiKey: string) {
    this.client = new Resend(apiKey)
  }

  async send(payload: EmailPayload): Promise<void> {
    await this.client.emails.send({
      from: 'Bens Seguros <noreply@bens.com.br>',
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    })
  }
}
