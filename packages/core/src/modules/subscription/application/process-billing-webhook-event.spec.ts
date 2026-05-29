import { describe, expect, it, vi } from 'vitest'
import type { CanonicalEvent } from '@repo/billing-port'
import type { SubscriptionRepository } from '../domain/subscription-repository.js'
import { ProcessBillingWebhookEvent } from './process-billing-webhook-event.js'

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

function makeRepo(
  override?: Partial<SubscriptionRepository>
): SubscriptionRepository {
  return {
    findWithPlanByOrganizationId: vi.fn(),
    findByProviderCustomerId: vi.fn().mockResolvedValue(subscriptionRow),
    updateStatus: vi.fn().mockResolvedValue(undefined),
    upsertInvoice: vi.fn().mockResolvedValue(undefined),
    findPlanBySlug: vi.fn(),
    createSubscription: vi.fn(),
    ...override,
  } as unknown as SubscriptionRepository
}

function makeOpts(override?: {
  publishInvalidation?: ReturnType<typeof vi.fn>
}) {
  return {
    logger: { warn: vi.fn(), info: vi.fn() },
    publishInvalidation:
      override?.publishInvalidation ?? vi.fn().mockResolvedValue(undefined),
  }
}

describe('ProcessBillingWebhookEvent', () => {
  // --- core dispatch ---

  it('despacha PAYMENT_SUCCEEDED pro handler', async () => {
    const event: CanonicalEvent = {
      ...baseEvent,
      type: 'PAYMENT_SUCCEEDED',
      providerPaymentId: 'pay_001',
      amountCents: 29900,
      currency: 'BRL',
    }
    const repo = makeRepo()
    const opts = makeOpts()
    const useCase = new ProcessBillingWebhookEvent(repo)

    const res = await useCase.execute(event, opts)

    expect(res).toEqual({ processed: true })
    expect(repo.upsertInvoice).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'PAID' })
    )
    expect(repo.updateStatus).toHaveBeenCalledWith('sub_db_001', 'ACTIVE')
  })

  it('skip silencioso quando subscription não encontrada (SE1)', async () => {
    const repo = makeRepo({
      findByProviderCustomerId: vi.fn().mockResolvedValue(null),
    })
    const opts = makeOpts()
    const event: CanonicalEvent = {
      ...baseEvent,
      type: 'PAYMENT_SUCCEEDED',
      providerPaymentId: 'pay_001',
      amountCents: 29900,
      currency: 'BRL',
    }
    const useCase = new ProcessBillingWebhookEvent(repo)

    const res = await useCase.execute(event, opts)

    expect(res).toEqual({ processed: false, reason: 'subscription_not_found' })
    expect(repo.upsertInvoice).not.toHaveBeenCalled()
    expect(opts.logger.warn).toHaveBeenCalled()
  })

  it('skip quando subscription billingManagedExternally', async () => {
    const repo = makeRepo({
      findByProviderCustomerId: vi.fn().mockResolvedValue({
        ...subscriptionRow,
        billingManagedExternally: true,
      }),
    })
    const opts = makeOpts()
    const event: CanonicalEvent = {
      ...baseEvent,
      type: 'PAYMENT_SUCCEEDED',
      providerPaymentId: 'pay_001',
      amountCents: 29900,
      currency: 'BRL',
    }
    const useCase = new ProcessBillingWebhookEvent(repo)

    const res = await useCase.execute(event, opts)

    expect(res).toEqual({
      processed: false,
      reason: 'billing_managed_externally',
    })
    expect(repo.upsertInvoice).not.toHaveBeenCalled()
  })

  it('despacha PAYMENT_FAILED', async () => {
    const event: CanonicalEvent = {
      ...baseEvent,
      type: 'PAYMENT_FAILED',
      providerPaymentId: 'pay_002',
      amountCents: 29900,
      currency: 'BRL',
    }
    const repo = makeRepo()
    const useCase = new ProcessBillingWebhookEvent(repo)
    await useCase.execute(event, makeOpts())
    expect(repo.updateStatus).toHaveBeenCalledWith('sub_db_001', 'PAST_DUE')
  })

  it('despacha PAYMENT_REFUNDED', async () => {
    const event: CanonicalEvent = {
      ...baseEvent,
      type: 'PAYMENT_REFUNDED',
      providerPaymentId: 'pay_003',
      refundedAmountCents: 29900,
      currency: 'BRL',
    }
    const repo = makeRepo()
    const useCase = new ProcessBillingWebhookEvent(repo)
    await useCase.execute(event, makeOpts())
    expect(repo.upsertInvoice).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'REFUNDED' })
    )
  })

  it('despacha SUBSCRIPTION_CANCELED_BY_PROVIDER', async () => {
    const event: CanonicalEvent = {
      ...baseEvent,
      type: 'SUBSCRIPTION_CANCELED_BY_PROVIDER',
    }
    const repo = makeRepo()
    const useCase = new ProcessBillingWebhookEvent(repo)
    await useCase.execute(event, makeOpts())
    expect(repo.updateStatus).toHaveBeenCalledWith('sub_db_001', 'CANCELED', {
      canceledAt: event.occurredAt,
    })
  })

  // --- handler edge cases (consolidados de billing-webhook-handlers.spec.ts) ---

  it('handlePaymentSucceeded: upserta Invoice PAID + atualiza Subscription ACTIVE + invalida cache', async () => {
    const publishInvalidation = vi.fn().mockResolvedValue(undefined)
    const repo = makeRepo()
    const useCase = new ProcessBillingWebhookEvent(repo)
    const event: CanonicalEvent = {
      ...baseEvent,
      type: 'PAYMENT_SUCCEEDED',
      providerPaymentId: 'pay_001',
      amountCents: 29900,
      currency: 'BRL',
    }

    await useCase.execute(event, makeOpts({ publishInvalidation }))

    expect(repo.upsertInvoice).toHaveBeenCalledWith({
      organizationId: 'org_001',
      subscriptionId: 'sub_db_001',
      billingProviderPaymentId: 'pay_001',
      amountCents: 29900,
      status: 'PAID',
      paidAt: baseEvent.occurredAt,
      periodStart: subscriptionRow.currentPeriodStart,
      periodEnd: subscriptionRow.currentPeriodEnd,
    })
    expect(repo.updateStatus).toHaveBeenCalledWith('sub_db_001', 'ACTIVE')
    expect(publishInvalidation).toHaveBeenCalledWith('org_001')
  })

  it('handlePaymentFailed: upserta Invoice OVERDUE + Subscription PAST_DUE + invalida cache', async () => {
    const publishInvalidation = vi.fn().mockResolvedValue(undefined)
    const repo = makeRepo()
    const useCase = new ProcessBillingWebhookEvent(repo)
    const event: CanonicalEvent = {
      ...baseEvent,
      type: 'PAYMENT_FAILED',
      providerPaymentId: 'pay_002',
      amountCents: 29900,
      currency: 'BRL',
    }

    await useCase.execute(event, makeOpts({ publishInvalidation }))

    expect(repo.upsertInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        billingProviderPaymentId: 'pay_002',
        status: 'OVERDUE',
      })
    )
    expect(repo.updateStatus).toHaveBeenCalledWith('sub_db_001', 'PAST_DUE')
    expect(publishInvalidation).toHaveBeenCalledWith('org_001')
  })

  it('handlePaymentRefunded: upserta Invoice REFUNDED + NÃO muda status da Subscription + invalida cache', async () => {
    const publishInvalidation = vi.fn().mockResolvedValue(undefined)
    const repo = makeRepo()
    const useCase = new ProcessBillingWebhookEvent(repo)
    const event: CanonicalEvent = {
      type: 'PAYMENT_REFUNDED',
      provider: 'asaas',
      externalId: 'evt_003',
      occurredAt: new Date('2026-05-16T10:00:00.000Z'),
      providerCustomerId: 'cus_001',
      providerSubscriptionId: 'sub_001',
      providerPaymentId: 'pay_003',
      refundedAmountCents: 29900,
      currency: 'BRL',
    }

    await useCase.execute(event, makeOpts({ publishInvalidation }))

    expect(repo.upsertInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        billingProviderPaymentId: 'pay_003',
        status: 'REFUNDED',
      })
    )
    expect(repo.updateStatus).not.toHaveBeenCalled()
    expect(publishInvalidation).toHaveBeenCalledWith('org_001')
  })

  it('handleSubscriptionCanceledByProvider: atualiza Subscription CANCELED + canceledAt + invalida cache', async () => {
    const publishInvalidation = vi.fn().mockResolvedValue(undefined)
    const repo = makeRepo()
    const useCase = new ProcessBillingWebhookEvent(repo)
    const canceledAt = new Date('2026-05-17T10:00:00.000Z')
    const event: CanonicalEvent = {
      type: 'SUBSCRIPTION_CANCELED_BY_PROVIDER',
      provider: 'asaas',
      externalId: 'evt_004',
      occurredAt: canceledAt,
      providerCustomerId: 'cus_001',
      providerSubscriptionId: 'sub_001',
    }

    await useCase.execute(event, makeOpts({ publishInvalidation }))

    expect(repo.upsertInvoice).not.toHaveBeenCalled()
    expect(repo.updateStatus).toHaveBeenCalledWith('sub_db_001', 'CANCELED', {
      canceledAt,
    })
    expect(publishInvalidation).toHaveBeenCalledWith('org_001')
  })
})
