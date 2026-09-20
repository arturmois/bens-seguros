import type { Entitlements } from '@repo/auth/entitlements'
import { DEFAULT_PERMISSIVE_ENTITLEMENTS } from '@repo/auth/entitlements'
import { inject, injectable } from 'tsyringe'
import type { SubscriptionRepository } from '../domain/subscription-repository.js'
import { buildEntitlements } from './build-entitlements.js'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

@injectable()
export class GetEntitlementsForOrg {
  constructor(
    @inject('SubscriptionRepository')
    private readonly subscriptionRepo: SubscriptionRepository
  ) {}

  async execute(organizationId: string): Promise<Entitlements> {
    const row =
      await this.subscriptionRepo.findWithPlanByOrganizationId(organizationId)

    if (!row) return DEFAULT_PERMISSIVE_ENTITLEMENTS

    return buildEntitlements(
      {
        status: row.status,
        trialEndsAt: row.trialEndsAt,
        billingManagedExternally: row.billingManagedExternally,
        customQuotas: isRecord(row.customQuotas) ? row.customQuotas : null,
      },
      {
        maxUsers: row.plan.maxUsers,
        maxProposalsPerMonth: row.plan.maxProposalsPerMonth,
        maxChannels: row.plan.maxChannels,
        maxConversationsPerOrg: row.plan.maxConversationsPerOrg,
        maxImportRows: row.plan.maxImportRows,
        maxLogoSizeBytes: row.plan.maxLogoSizeBytes,
        aiEnabled: row.plan.aiEnabled,
        aiMessagesIncluded: row.plan.aiMessagesIncluded,
        aiOverageCentsPerMessage: row.plan.aiOverageCentsPerMessage,
        features: isRecord(row.plan.features) ? row.plan.features : {},
      }
    )
  }
}
