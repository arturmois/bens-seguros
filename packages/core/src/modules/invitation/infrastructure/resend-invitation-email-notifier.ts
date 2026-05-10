import pino from 'pino'
import {
  ResendEmailProvider,
  invitationEmail,
} from '../../notification/index.js'
import type {
  InvitationEmailInput,
  InvitationEmailNotifier,
} from '../domain/invitation-email-notifier.js'

const logger = pino({ name: 'invitation-email-notifier' })

interface ResendInvitationEmailNotifierConfig {
  apiKey: string
  fromAddress: string
  frontendUrl: string
}

export class ResendInvitationEmailNotifier implements InvitationEmailNotifier {
  private readonly emailProvider: ResendEmailProvider
  private readonly frontendUrl: string

  constructor(config: ResendInvitationEmailNotifierConfig) {
    this.emailProvider = new ResendEmailProvider({
      apiKey: config.apiKey,
      fromAddress: config.fromAddress,
    })
    this.frontendUrl = config.frontendUrl
  }

  async notifyInvited(input: InvitationEmailInput): Promise<void> {
    const html = invitationEmail({
      inviterName: input.inviterName,
      organizationName: input.organizationName,
      role: input.role,
      frontendUrl: this.frontendUrl,
      invitationId: input.invitationId,
    })
    try {
      await this.emailProvider.send({
        to: input.to,
        subject: `Convite para ${input.organizationName}`,
        html,
      })
    } catch (err: unknown) {
      logger.warn(
        { err, to: input.to },
        'Failed to send invitation email (non-critical)'
      )
    }
  }
}

export class NoopInvitationEmailNotifier implements InvitationEmailNotifier {
  async notifyInvited(_input: InvitationEmailInput): Promise<void> {
    return Promise.resolve()
  }
}
