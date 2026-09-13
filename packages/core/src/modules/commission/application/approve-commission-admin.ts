import { inject, injectable } from 'tsyringe'
import type { MemberRepository } from '../../workspace/members/domain/member-repository.js'
import type { NotificationDispatcher } from '../../notification/domain/notification-dispatcher.js'
import { commissionApprovedEmail } from '../../notification/infrastructure/email-templates/commission-approved.js'
import { CommissionErrors } from '../domain/commission-errors.js'
import type {
  CommissionData,
  CommissionRepository,
} from '../domain/commission-repository.js'
import { Commission } from '../domain/commission.js'

interface NotifyOptions {
  readonly approverName: string | null
  readonly frontendUrl: string
}

@injectable()
export class ApproveCommissionAdmin {
  constructor(
    @inject('CommissionRepository')
    private readonly commissionRepo: CommissionRepository,
    @inject('MemberRepository') private readonly memberRepo: MemberRepository,
    @inject('NotificationDispatcher')
    private readonly dispatcher: NotificationDispatcher
  ) {}

  async execute(
    id: string,
    organizationId: string,
    userId: string,
    notify?: NotifyOptions
  ): Promise<CommissionData> {
    const data = await this.commissionRepo.findById(id, organizationId)
    if (!data) {
      throw CommissionErrors.notFound(id)
    }
    const commission = Commission.restore({
      ...data,
      splitPercentage: data.splitPercentage ?? 10000,
    })
    commission.approveByAdmin(userId)
    const updated = await this.commissionRepo.update(commission)
    if (notify && updated.salespersonId) {
      await this.notifySalesperson(updated, notify)
    }
    return updated
  }

  private async notifySalesperson(
    commission: CommissionData,
    notify: NotifyOptions
  ): Promise<void> {
    const recipient = await this.memberRepo.findContactByUserId(
      commission.organizationId,
      commission.salespersonId
    )
    if (!recipient) return
    const valueFormatted = (
      commission.commissionValueInCents / 100
    ).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    await this.dispatcher.dispatch([
      {
        notification: {
          organizationId: commission.organizationId,
          userId: commission.salespersonId,
          type: 'COMMISSION_APPROVED',
          title: 'Comissão aprovada',
          body: `Comissão de ${valueFormatted} aprovada`,
          entityType: 'Commission',
          entityId: commission.id,
        },
        email: recipient.email
          ? {
              to: recipient.email,
              subject: 'Sua comissão foi aprovada',
              html: commissionApprovedEmail({
                userName: recipient.name ?? '',
                policyNumber: String(commission.policyNumber ?? 'N/A'),
                value: valueFormatted,
                approvedBy: notify.approverName ?? 'Admin',
                frontendUrl: notify.frontendUrl,
              }),
            }
          : undefined,
      },
    ])
  }
}
