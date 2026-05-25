import { describe, expect, it, vi } from 'vitest'
import type { CanonicalEvent } from '@repo/billing-port'
import {
  type BillingHandlerDeps,
  handlePaymentFailed,
  handlePaymentRefunded,
  handlePaymentSucceeded,
  handleSubscriptionCanceledByProvider,
} from './billing-webhook-handlers.js'

const subscriptionRow = {
  id: 'sub_db_001',
  organizationId: 'org_001',
  status: 'TRIALING' as const,
  currentPeriodStart: new Date('2026-05-01'),
  currentPeriodEnd: new Date('2026-06-01'),
  billingManagedExternally: false,
}

function mockDeps(): BillingHandlerDeps {
  return {
    upsertInvoice: vi.fn().mockResolvedValue(undefined),
    updateSubscriptionStatus: vi.fn().mockResolvedValue(undefined),
    publishInvalidation: vi.fn().mockResolvedValue(undefined),
  }
}

const paymentSucceededEvent: CanonicalEvent = {
  type: 'PAYMENT_SUCCEEDED',
  provider: 'asaas',
  externalId: 'evt_001',
  occurredAt: new Date('2026-05-15T10:00:00.000Z'),
  providerCustomerId: 'cus_001',
  providerSubscriptionId: 'sub_001',
  providerPaymentId: 'pay_001',
  amountCents: 29900,
  currency: 'BRL',
}

describe('handlePaymentSucceeded', () => {
  it('upserta Invoice PAID + atualiza Subscription ACTIVE + invalida cache', async () => {
    const deps = mockDeps()
    await handlePaymentSucceeded(deps, subscriptionRow, paymentSucceededEvent)

    expect(deps.upsertInvoice).toHaveBeenCalledWith({
      organizationId: 'org_001',
      subscriptionId: 'sub_db_001',
      billingProviderPaymentId: 'pay_001',
      amountCents: 29900,
      status: 'PAID',
      paidAt: paymentSucceededEvent.occurredAt,
      periodStart: subscriptionRow.currentPeriodStart,
      periodEnd: subscriptionRow.currentPeriodEnd,
    })
    expect(deps.updateSubscriptionStatus).toHaveBeenCalledWith(
      'sub_db_001',
      'ACTIVE'
    )
    expect(deps.publishInvalidation).toHaveBeenCalledWith('org_001')
  })
})

describe('handlePaymentFailed', () => {
  it('upserta Invoice OVERDUE + Subscription PAST_DUE + invalida cache', async () => {
    const event: CanonicalEvent = {
      ...paymentSucceededEvent,
      type: 'PAYMENT_FAILED',
      reason: 'insufficient_funds',
    }
    const deps = mockDeps()
    await handlePaymentFailed(deps, subscriptionRow, event)

    expect(deps.upsertInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        billingProviderPaymentId: 'pay_001',
        status: 'OVERDUE',
      })
    )
    expect(deps.updateSubscriptionStatus).toHaveBeenCalledWith(
      'sub_db_001',
      'PAST_DUE'
    )
    expect(deps.publishInvalidation).toHaveBeenCalledWith('org_001')
  })
})

describe('handlePaymentRefunded', () => {
  it('upserta Invoice REFUNDED + NÃO muda status da Subscription + invalida cache', async () => {
    const event: CanonicalEvent = {
      type: 'PAYMENT_REFUNDED',
      provider: 'asaas',
      externalId: 'evt_003',
      occurredAt: new Date('2026-05-16T10:00:00.000Z'),
      providerCustomerId: 'cus_001',
      providerSubscriptionId: 'sub_001',
      providerPaymentId: 'pay_001',
      refundedAmountCents: 29900,
      currency: 'BRL',
    }
    const deps = mockDeps()
    await handlePaymentRefunded(deps, subscriptionRow, event)

    expect(deps.upsertInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        billingProviderPaymentId: 'pay_001',
        status: 'REFUNDED',
      })
    )
    expect(deps.updateSubscriptionStatus).not.toHaveBeenCalled()
    expect(deps.publishInvalidation).toHaveBeenCalledWith('org_001')
  })
})

describe('handleSubscriptionCanceledByProvider', () => {
  it('atualiza Subscription CANCELED + canceledAt + invalida cache', async () => {
    const event: CanonicalEvent = {
      type: 'SUBSCRIPTION_CANCELED_BY_PROVIDER',
      provider: 'asaas',
      externalId: 'evt_004',
      occurredAt: new Date('2026-05-17T10:00:00.000Z'),
      providerCustomerId: 'cus_001',
      providerSubscriptionId: 'sub_001',
    }
    const deps = mockDeps()
    await handleSubscriptionCanceledByProvider(deps, subscriptionRow, event)

    expect(deps.upsertInvoice).not.toHaveBeenCalled()
    expect(deps.updateSubscriptionStatus).toHaveBeenCalledWith(
      'sub_db_001',
      'CANCELED',
      { canceledAt: event.occurredAt }
    )
    expect(deps.publishInvalidation).toHaveBeenCalledWith('org_001')
  })
})
