import type { CanonicalEvent } from '@repo/billing-port'

export type BillingSubscriptionRow = {
  readonly id: string
  readonly organizationId: string
  readonly status: string
  readonly currentPeriodStart: Date
  readonly currentPeriodEnd: Date
  readonly billingManagedExternally: boolean
}

export type UpsertInvoiceInput = {
  organizationId: string
  subscriptionId: string
  billingProviderPaymentId: string
  amountCents: number
  status: 'PAID' | 'OVERDUE' | 'REFUNDED'
  paidAt?: Date
  periodStart: Date
  periodEnd: Date
}

export type UpdateSubscriptionStatusOpts = {
  canceledAt?: Date
}

export type BillingHandlerDeps = {
  upsertInvoice(input: UpsertInvoiceInput): Promise<void>
  updateSubscriptionStatus(
    subscriptionId: string,
    status: 'ACTIVE' | 'PAST_DUE' | 'CANCELED',
    opts?: UpdateSubscriptionStatusOpts
  ): Promise<void>
  publishInvalidation(organizationId: string): Promise<void>
}

export async function handlePaymentSucceeded(
  deps: BillingHandlerDeps,
  sub: BillingSubscriptionRow,
  event: Extract<CanonicalEvent, { type: 'PAYMENT_SUCCEEDED' }>
): Promise<void> {
  await deps.upsertInvoice({
    organizationId: sub.organizationId,
    subscriptionId: sub.id,
    billingProviderPaymentId: event.providerPaymentId,
    amountCents: event.amountCents,
    status: 'PAID',
    paidAt: event.occurredAt,
    periodStart: sub.currentPeriodStart,
    periodEnd: sub.currentPeriodEnd,
  })
  await deps.updateSubscriptionStatus(sub.id, 'ACTIVE')
  await deps.publishInvalidation(sub.organizationId)
}

export async function handlePaymentFailed(
  deps: BillingHandlerDeps,
  sub: BillingSubscriptionRow,
  event: Extract<CanonicalEvent, { type: 'PAYMENT_FAILED' }>
): Promise<void> {
  await deps.upsertInvoice({
    organizationId: sub.organizationId,
    subscriptionId: sub.id,
    billingProviderPaymentId: event.providerPaymentId,
    amountCents: event.amountCents,
    status: 'OVERDUE',
    periodStart: sub.currentPeriodStart,
    periodEnd: sub.currentPeriodEnd,
  })
  await deps.updateSubscriptionStatus(sub.id, 'PAST_DUE')
  await deps.publishInvalidation(sub.organizationId)
}

export async function handlePaymentRefunded(
  deps: BillingHandlerDeps,
  sub: BillingSubscriptionRow,
  event: Extract<CanonicalEvent, { type: 'PAYMENT_REFUNDED' }>
): Promise<void> {
  await deps.upsertInvoice({
    organizationId: sub.organizationId,
    subscriptionId: sub.id,
    billingProviderPaymentId: event.providerPaymentId,
    amountCents: event.refundedAmountCents,
    status: 'REFUNDED',
    periodStart: sub.currentPeriodStart,
    periodEnd: sub.currentPeriodEnd,
  })
  await deps.publishInvalidation(sub.organizationId)
}

export async function handleSubscriptionCanceledByProvider(
  deps: BillingHandlerDeps,
  sub: BillingSubscriptionRow,
  event: Extract<CanonicalEvent, { type: 'SUBSCRIPTION_CANCELED_BY_PROVIDER' }>
): Promise<void> {
  await deps.updateSubscriptionStatus(sub.id, 'CANCELED', {
    canceledAt: event.occurredAt,
  })
  await deps.publishInvalidation(sub.organizationId)
}
