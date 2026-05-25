import { describe, expect, it } from 'vitest'
import { CanonicalEventSchema, type CanonicalEvent } from './canonical-event'

describe('CanonicalEventSchema', () => {
  it('parseia PAYMENT_SUCCEEDED válido', () => {
    const event = CanonicalEventSchema.parse({
      type: 'PAYMENT_SUCCEEDED',
      provider: 'asaas',
      externalId: 'evt_123',
      occurredAt: '2026-05-24T12:00:00.000Z',
      providerCustomerId: 'cus_abc',
      providerSubscriptionId: 'sub_xyz',
      providerPaymentId: 'pay_001',
      amountCents: 29900,
      currency: 'BRL',
    })
    expect(event.type).toBe('PAYMENT_SUCCEEDED')
    if (event.type === 'PAYMENT_SUCCEEDED') {
      expect(event.amountCents).toBe(29900)
    }
  })

  it('parseia PAYMENT_FAILED com reason opcional', () => {
    const event = CanonicalEventSchema.parse({
      type: 'PAYMENT_FAILED',
      provider: 'asaas',
      externalId: 'evt_124',
      occurredAt: '2026-05-24T12:00:00.000Z',
      providerCustomerId: 'cus_abc',
      providerSubscriptionId: 'sub_xyz',
      providerPaymentId: 'pay_002',
      amountCents: 29900,
      currency: 'BRL',
      reason: 'insufficient_funds',
    })
    expect(event.type).toBe('PAYMENT_FAILED')
    if (event.type === 'PAYMENT_FAILED') {
      expect(event.reason).toBe('insufficient_funds')
    }
  })

  it('parseia PAYMENT_REFUNDED', () => {
    const event = CanonicalEventSchema.parse({
      type: 'PAYMENT_REFUNDED',
      provider: 'asaas',
      externalId: 'evt_125',
      occurredAt: '2026-05-24T12:00:00.000Z',
      providerCustomerId: 'cus_abc',
      providerSubscriptionId: 'sub_xyz',
      providerPaymentId: 'pay_003',
      refundedAmountCents: 29900,
      currency: 'BRL',
    })
    expect(event.type).toBe('PAYMENT_REFUNDED')
  })

  it('parseia SUBSCRIPTION_CANCELED_BY_PROVIDER', () => {
    const event = CanonicalEventSchema.parse({
      type: 'SUBSCRIPTION_CANCELED_BY_PROVIDER',
      provider: 'asaas',
      externalId: 'evt_126',
      occurredAt: '2026-05-24T12:00:00.000Z',
      providerCustomerId: 'cus_abc',
      providerSubscriptionId: 'sub_xyz',
    })
    expect(event.type).toBe('SUBSCRIPTION_CANCELED_BY_PROVIDER')
  })

  it('rejeita tipo desconhecido', () => {
    expect(() =>
      CanonicalEventSchema.parse({
        type: 'UNKNOWN_EVENT',
        provider: 'asaas',
        externalId: 'evt_127',
        occurredAt: '2026-05-24T12:00:00.000Z',
        providerCustomerId: 'cus_abc',
        providerSubscriptionId: 'sub_xyz',
      })
    ).toThrow()
  })

  it('rejeita amountCents negativo em PAYMENT_SUCCEEDED', () => {
    expect(() =>
      CanonicalEventSchema.parse({
        type: 'PAYMENT_SUCCEEDED',
        provider: 'asaas',
        externalId: 'evt_128',
        occurredAt: '2026-05-24T12:00:00.000Z',
        providerCustomerId: 'cus_abc',
        providerSubscriptionId: 'sub_xyz',
        providerPaymentId: 'pay_004',
        amountCents: -100,
        currency: 'BRL',
      })
    ).toThrow()
  })

  it('rejeita refundedAmountCents negativo em PAYMENT_REFUNDED', () => {
    expect(() =>
      CanonicalEventSchema.parse({
        type: 'PAYMENT_REFUNDED',
        provider: 'asaas',
        externalId: 'evt_129',
        occurredAt: '2026-05-24T12:00:00.000Z',
        providerCustomerId: 'cus_abc',
        providerSubscriptionId: 'sub_xyz',
        providerPaymentId: 'pay_005',
        refundedAmountCents: -50,
        currency: 'BRL',
      })
    ).toThrow()
  })

  it('narrowing por type funciona em código consumidor', () => {
    const events: CanonicalEvent[] = [
      {
        type: 'PAYMENT_SUCCEEDED',
        provider: 'asaas',
        externalId: 'evt_x',
        occurredAt: new Date('2026-05-24T12:00:00.000Z'),
        providerCustomerId: 'cus_x',
        providerSubscriptionId: 'sub_x',
        providerPaymentId: 'pay_x',
        amountCents: 100,
        currency: 'BRL',
      },
    ]

    const totals = events.reduce((sum, e) => {
      if (e.type === 'PAYMENT_SUCCEEDED') return sum + e.amountCents
      return sum
    }, 0)
    expect(totals).toBe(100)
  })
})
