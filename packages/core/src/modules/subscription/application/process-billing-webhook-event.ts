import type { CanonicalEvent } from '@repo/billing-port'
import { inject, injectable } from 'tsyringe'
import type {
  SubscriptionBillingRow,
  SubscriptionRepository,
} from '../domain/subscription-repository.js'

export type ProcessLogger = {
  warn(msg: object | string, ...args: unknown[]): void
  info(msg: object | string, ...args: unknown[]): void
}

export type ProcessResult =
  | { processed: true }
  | {
      processed: false
      reason: 'subscription_not_found' | 'billing_managed_externally'
    }

type ProcessOpts = {
  logger: ProcessLogger
  publishInvalidation: (organizationId: string) => Promise<void>
}

// Internal helpers — not exported (implementation detail of this use case)
async function handlePaymentSucceeded(
  repo: SubscriptionRepository,
  sub: SubscriptionBillingRow,
  event: Extract<CanonicalEvent, { type: 'PAYMENT_SUCCEEDED' }>,
  publishInvalidation: (orgId: string) => Promise<void>
): Promise<void> {
  await repo.upsertInvoice({
    organizationId: sub.organizationId,
    subscriptionId: sub.id,
    billingProviderPaymentId: event.providerPaymentId,
    amountCents: event.amountCents,
    status: 'PAID',
    paidAt: event.occurredAt,
    periodStart: sub.currentPeriodStart,
    periodEnd: sub.currentPeriodEnd,
  })
  await repo.updateStatus(sub.id, 'ACTIVE')
  await publishInvalidation(sub.organizationId)
}

async function handlePaymentFailed(
  repo: SubscriptionRepository,
  sub: SubscriptionBillingRow,
  event: Extract<CanonicalEvent, { type: 'PAYMENT_FAILED' }>,
  publishInvalidation: (orgId: string) => Promise<void>
): Promise<void> {
  await repo.upsertInvoice({
    organizationId: sub.organizationId,
    subscriptionId: sub.id,
    billingProviderPaymentId: event.providerPaymentId,
    amountCents: event.amountCents,
    status: 'OVERDUE',
    periodStart: sub.currentPeriodStart,
    periodEnd: sub.currentPeriodEnd,
  })
  await repo.updateStatus(sub.id, 'PAST_DUE')
  await publishInvalidation(sub.organizationId)
}

async function handlePaymentRefunded(
  repo: SubscriptionRepository,
  sub: SubscriptionBillingRow,
  event: Extract<CanonicalEvent, { type: 'PAYMENT_REFUNDED' }>,
  publishInvalidation: (orgId: string) => Promise<void>
): Promise<void> {
  await repo.upsertInvoice({
    organizationId: sub.organizationId,
    subscriptionId: sub.id,
    billingProviderPaymentId: event.providerPaymentId,
    amountCents: event.refundedAmountCents,
    status: 'REFUNDED',
    periodStart: sub.currentPeriodStart,
    periodEnd: sub.currentPeriodEnd,
  })
  await publishInvalidation(sub.organizationId)
}

async function handleSubscriptionCanceledByProvider(
  repo: SubscriptionRepository,
  sub: SubscriptionBillingRow,
  event: Extract<CanonicalEvent, { type: 'SUBSCRIPTION_CANCELED_BY_PROVIDER' }>,
  publishInvalidation: (orgId: string) => Promise<void>
): Promise<void> {
  await repo.updateStatus(sub.id, 'CANCELED', {
    canceledAt: event.occurredAt,
  })
  await publishInvalidation(sub.organizationId)
}

@injectable()
export class ProcessBillingWebhookEvent {
  constructor(
    @inject('SubscriptionRepository')
    private readonly subscriptionRepo: SubscriptionRepository
  ) {}

  async execute(
    event: CanonicalEvent,
    opts: ProcessOpts
  ): Promise<ProcessResult> {
    const subscription = await this.subscriptionRepo.findByProviderCustomerId(
      event.providerCustomerId
    )

    if (subscription === null) {
      opts.logger.warn(
        {
          providerCustomerId: event.providerCustomerId,
          eventType: event.type,
          externalId: event.externalId,
        },
        'Billing webhook: subscription not found for providerCustomerId (SE1 — silent skip)'
      )
      return { processed: false, reason: 'subscription_not_found' }
    }

    if (subscription.billingManagedExternally) {
      opts.logger.warn(
        {
          organizationId: subscription.organizationId,
          eventType: event.type,
        },
        'Billing webhook: skipping event for BILLED_EXTERNALLY subscription'
      )
      return { processed: false, reason: 'billing_managed_externally' }
    }

    switch (event.type) {
      case 'PAYMENT_SUCCEEDED':
        await handlePaymentSucceeded(
          this.subscriptionRepo,
          subscription,
          event,
          opts.publishInvalidation
        )
        break
      case 'PAYMENT_FAILED':
        await handlePaymentFailed(
          this.subscriptionRepo,
          subscription,
          event,
          opts.publishInvalidation
        )
        break
      case 'PAYMENT_REFUNDED':
        await handlePaymentRefunded(
          this.subscriptionRepo,
          subscription,
          event,
          opts.publishInvalidation
        )
        break
      case 'SUBSCRIPTION_CANCELED_BY_PROVIDER':
        await handleSubscriptionCanceledByProvider(
          this.subscriptionRepo,
          subscription,
          event,
          opts.publishInvalidation
        )
        break
      default: {
        const exhaustive: never = event
        void exhaustive
        opts.logger.warn(
          { event },
          'Billing webhook: unhandled canonical event type (exhaustive switch)'
        )
      }
    }

    opts.logger.info(
      {
        organizationId: subscription.organizationId,
        eventType: event.type,
        externalId: event.externalId,
      },
      'Billing webhook: event processed'
    )
    return { processed: true }
  }
}
