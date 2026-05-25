import type { CanonicalEvent } from '@repo/billing-port'
import {
  type BillingHandlerDeps,
  type BillingSubscriptionRow,
  handlePaymentFailed,
  handlePaymentRefunded,
  handlePaymentSucceeded,
  handleSubscriptionCanceledByProvider,
} from './billing-webhook-handlers.js'

export type ProcessBillingDeps = {
  findSubscriptionByProviderCustomerId(
    providerCustomerId: string
  ): Promise<BillingSubscriptionRow | null>
  handlers: BillingHandlerDeps
  logger: {
    warn(msg: object | string, ...args: unknown[]): void
    info(msg: object | string, ...args: unknown[]): void
  }
}

export type ProcessResult =
  | { processed: true }
  | {
      processed: false
      reason: 'subscription_not_found' | 'billing_managed_externally'
    }

export async function processBillingWebhookEvent(
  deps: ProcessBillingDeps,
  event: CanonicalEvent
): Promise<ProcessResult> {
  const subscription = await deps.findSubscriptionByProviderCustomerId(
    event.providerCustomerId
  )

  if (subscription === null) {
    deps.logger.warn(
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
    deps.logger.warn(
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
      await handlePaymentSucceeded(deps.handlers, subscription, event)
      break
    case 'PAYMENT_FAILED':
      await handlePaymentFailed(deps.handlers, subscription, event)
      break
    case 'PAYMENT_REFUNDED':
      await handlePaymentRefunded(deps.handlers, subscription, event)
      break
    case 'SUBSCRIPTION_CANCELED_BY_PROVIDER':
      await handleSubscriptionCanceledByProvider(
        deps.handlers,
        subscription,
        event
      )
      break
    default: {
      const exhaustive: never = event
      void exhaustive
      deps.logger.warn(
        { event },
        'Billing webhook: unhandled canonical event type (exhaustive switch)'
      )
    }
  }

  deps.logger.info(
    {
      organizationId: subscription.organizationId,
      eventType: event.type,
      externalId: event.externalId,
    },
    'Billing webhook: event processed'
  )
  return { processed: true }
}
