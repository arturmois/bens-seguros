import { describe, expect, it, vi } from 'vitest'
import type { CanonicalEvent } from '@repo/billing-port'
import {
  type ProcessBillingDeps,
  processBillingWebhookEvent,
} from './process-billing-webhook-event.js'

const subscriptionRow = {
  id: 'sub_db_001',
  organizationId: 'org_001',
  status: 'TRIALING',
  currentPeriodStart: new Date('2026-05-01'),
  currentPeriodEnd: new Date('2026-06-01'),
  billingManagedExternally: false,
}

const baseEvent = {
  provider: 'asaas' as const,
  externalId: 'evt_xxx',
  occurredAt: new Date('2026-05-15T10:00:00.000Z'),
  providerCustomerId: 'cus_001',
  providerSubscriptionId: 'sub_001',
}

function mockDeps(
  override: Partial<ProcessBillingDeps> = {}
): ProcessBillingDeps {
  return {
    findSubscriptionByProviderCustomerId: vi
      .fn()
      .mockResolvedValue(subscriptionRow),
    handlers: {
      upsertInvoice: vi.fn().mockResolvedValue(undefined),
      updateSubscriptionStatus: vi.fn().mockResolvedValue(undefined),
      publishInvalidation: vi.fn().mockResolvedValue(undefined),
    },
    logger: { warn: vi.fn(), info: vi.fn() },
    ...override,
  }
}

describe('processBillingWebhookEvent', () => {
  it('despacha PAYMENT_SUCCEEDED pro handler', async () => {
    const event: CanonicalEvent = {
      ...baseEvent,
      type: 'PAYMENT_SUCCEEDED',
      providerPaymentId: 'pay_001',
      amountCents: 29900,
      currency: 'BRL',
    }
    const deps = mockDeps()

    const res = await processBillingWebhookEvent(deps, event)

    expect(res).toEqual({ processed: true })
    expect(deps.handlers.upsertInvoice).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'PAID' })
    )
    expect(deps.handlers.updateSubscriptionStatus).toHaveBeenCalledWith(
      'sub_db_001',
      'ACTIVE'
    )
  })

  it('skip silencioso quando subscription não encontrada (SE1)', async () => {
    const deps = mockDeps({
      findSubscriptionByProviderCustomerId: vi.fn().mockResolvedValue(null),
    })
    const event: CanonicalEvent = {
      ...baseEvent,
      type: 'PAYMENT_SUCCEEDED',
      providerPaymentId: 'pay_001',
      amountCents: 29900,
      currency: 'BRL',
    }

    const res = await processBillingWebhookEvent(deps, event)

    expect(res).toEqual({ processed: false, reason: 'subscription_not_found' })
    expect(deps.handlers.upsertInvoice).not.toHaveBeenCalled()
    expect(deps.logger.warn).toHaveBeenCalled()
  })

  it('skip quando subscription billingManagedExternally', async () => {
    const externalSub = { ...subscriptionRow, billingManagedExternally: true }
    const deps = mockDeps({
      findSubscriptionByProviderCustomerId: vi
        .fn()
        .mockResolvedValue(externalSub),
    })
    const event: CanonicalEvent = {
      ...baseEvent,
      type: 'PAYMENT_SUCCEEDED',
      providerPaymentId: 'pay_001',
      amountCents: 29900,
      currency: 'BRL',
    }

    const res = await processBillingWebhookEvent(deps, event)

    expect(res).toEqual({
      processed: false,
      reason: 'billing_managed_externally',
    })
    expect(deps.handlers.upsertInvoice).not.toHaveBeenCalled()
  })

  it('despacha PAYMENT_FAILED', async () => {
    const event: CanonicalEvent = {
      ...baseEvent,
      type: 'PAYMENT_FAILED',
      providerPaymentId: 'pay_002',
      amountCents: 29900,
      currency: 'BRL',
    }
    const deps = mockDeps()
    await processBillingWebhookEvent(deps, event)
    expect(deps.handlers.updateSubscriptionStatus).toHaveBeenCalledWith(
      'sub_db_001',
      'PAST_DUE'
    )
  })

  it('despacha PAYMENT_REFUNDED', async () => {
    const event: CanonicalEvent = {
      ...baseEvent,
      type: 'PAYMENT_REFUNDED',
      providerPaymentId: 'pay_003',
      refundedAmountCents: 29900,
      currency: 'BRL',
    }
    const deps = mockDeps()
    await processBillingWebhookEvent(deps, event)
    expect(deps.handlers.upsertInvoice).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'REFUNDED' })
    )
  })

  it('despacha SUBSCRIPTION_CANCELED_BY_PROVIDER', async () => {
    const event: CanonicalEvent = {
      ...baseEvent,
      type: 'SUBSCRIPTION_CANCELED_BY_PROVIDER',
    }
    const deps = mockDeps()
    await processBillingWebhookEvent(deps, event)
    expect(deps.handlers.updateSubscriptionStatus).toHaveBeenCalledWith(
      'sub_db_001',
      'CANCELED',
      { canceledAt: event.occurredAt }
    )
  })
})
