import { inject, injectable } from 'tsyringe'

import type { MemberRepository } from '../../workspace/members/domain/member-repository.js'
import type { NotificationDispatcher } from '../../notification/domain/notification-dispatcher.js'
import type { NotificationJobData } from '../../notification/domain/notification-types.js'
import { claimOpenedEmail } from '../../notification/infrastructure/email-templates/claim-opened.js'
import type {
  ClaimData,
  ClaimRepository,
  CreateClaimInput,
} from '../domain/claim-repository.js'

const NOTIFY_ROLES = ['OWNER', 'ADMIN', 'MANAGER'] as const

interface NotifyOptions {
  readonly creatorUserId: string
  readonly frontendUrl: string
}

@injectable()
export class CreateClaim {
  constructor(
    @inject('ClaimRepository') private readonly claimRepo: ClaimRepository,
    @inject('MemberRepository') private readonly memberRepo: MemberRepository,
    @inject('NotificationDispatcher')
    private readonly dispatcher: NotificationDispatcher
  ) {}

  async execute(
    dto: CreateClaimInput,
    notify?: NotifyOptions
  ): Promise<ClaimData> {
    const claim = await this.claimRepo.create(dto)
    if (!notify) return claim
    const recipients = await this.memberRepo.findContactsByRoles(
      claim.organizationId,
      NOTIFY_ROLES,
      notify.creatorUserId
    )
    if (recipients.length === 0) return claim
    const items = recipients.map((recipient) =>
      this.toJob(claim, recipient, notify.frontendUrl)
    )
    await this.dispatcher.dispatch(items)
    return claim
  }

  private toJob(
    claim: ClaimData,
    recipient: { userId: string; email: string | null; name: string | null },
    frontendUrl: string
  ): NotificationJobData {
    const claimNumber = String(claim.claimNumber)
    return {
      notification: {
        organizationId: claim.organizationId,
        userId: recipient.userId,
        type: 'CLAIM_OPENED',
        title: 'Novo sinistro aberto',
        body: `Sinistro #${claimNumber} aberto`,
        entityType: 'Claim',
        entityId: claim.id,
      },
      email: recipient.email
        ? {
            to: recipient.email,
            subject: `Novo sinistro #${claimNumber}`,
            html: claimOpenedEmail({
              userName: recipient.name ?? '',
              claimNumber,
              clientName: claim.clientName ?? 'N/A',
              priority: claim.priority,
              frontendUrl,
            }),
          }
        : undefined,
    }
  }
}
