import { inject, injectable } from 'tsyringe'
import type { MemberRepository } from '../../workspace/members/domain/member-repository.js'
import type { NotificationDispatcher } from '../../notification/domain/notification-dispatcher.js'
import { commissionRejectedEmail } from '../infrastructure/notifications/commission-rejected.js'
import { CommissionErrors } from '../domain/commission-errors.js'
import type {
  CommissionData,
  CommissionRepository,
} from '../domain/commission-repository.js'
import { Commission } from '../domain/commission.js'

interface RejectCommissionInput {
  id: string
  organizationId: string
  userId: string
  reason: string
}

interface NotifyOptions {
  readonly rejecterName: string | null
  readonly frontendUrl: string
}

@injectable()
export class RejectCommission {
  constructor(
    @inject('CommissionRepository')
    private readonly commissionRepo: CommissionRepository,
    @inject('MemberRepository') private readonly memberRepo: MemberRepository,
    @inject('NotificationDispatcher')
    private readonly dispatcher: NotificationDispatcher
  ) {}

  async execute(
    input: RejectCommissionInput,
    notify?: NotifyOptions
  ): Promise<CommissionData> {
    const data = await this.commissionRepo.findById(
      input.id,
      input.organizationId
    )
    if (!data) {
      throw CommissionErrors.notFound(input.id)
    }
    const commission = Commission.restore({
      ...data,
      splitPercentage: data.splitPercentage ?? 10000,
    })
    commission.reject(input.userId, input.reason)
    const updated = await this.commissionRepo.update(commission)
    if (notify && updated.salespersonId) {
      await this.notifySalesperson(updated, input.reason, notify)
    }
    return updated
  }

  private async notifySalesperson(
    commission: CommissionData,
    reason: string,
    notify: NotifyOptions
  ): Promise<void> {
    const recipient = await this.memberRepo.findContactByUserId(
      commission.organizationId,
      commission.salespersonId
    )
    if (!recipient) return
    await this.dispatcher.dispatch([
      {
        notification: {
          organizationId: commission.organizationId,
          userId: commission.salespersonId,
          type: 'COMMISSION_REJECTED',
          title: 'Comissão rejeitada',
          body: `Comissão rejeitada: ${reason}`,
          entityType: 'Commission',
          entityId: commission.id,
        },
        email: recipient.email
          ? {
              to: recipient.email,
              subject: 'Sua comissão foi rejeitada',
              html: commissionRejectedEmail({
                userName: recipient.name ?? '',
                policyNumber: String(commission.policyNumber ?? 'N/A'),
                reason,
                rejectedBy: notify.rejecterName ?? 'Admin',
                frontendUrl: notify.frontendUrl,
              }),
            }
          : undefined,
      },
    ])
  }
}
