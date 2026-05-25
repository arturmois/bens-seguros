import { describe, expect, it } from 'vitest'
import {
  PlanRefSchema,
  centsToDecimal,
  decimalToCents,
  domainCycleToAsaas,
  asaasEventToCanonicalType,
} from './mappers'

describe('PlanRefSchema', () => {
  it('aceita planRef válido', () => {
    expect(() =>
      PlanRefSchema.parse({
        provider: 'asaas',
        priceCents: 29900,
        currency: 'BRL',
        billingPeriod: 'monthly',
      })
    ).not.toThrow()
  })

  it('rejeita priceCents float', () => {
    expect(() =>
      PlanRefSchema.parse({
        provider: 'asaas',
        priceCents: 299.5,
        currency: 'BRL',
        billingPeriod: 'monthly',
      })
    ).toThrow()
  })

  it('rejeita priceCents negativo', () => {
    expect(() =>
      PlanRefSchema.parse({
        provider: 'asaas',
        priceCents: -100,
        currency: 'BRL',
        billingPeriod: 'monthly',
      })
    ).toThrow()
  })
})

describe('centsToDecimal / decimalToCents', () => {
  it('round-trips inteiros', () => {
    expect(centsToDecimal(29900)).toBe(299)
    expect(centsToDecimal(150)).toBe(1.5)
    expect(decimalToCents(299)).toBe(29900)
    expect(decimalToCents(1.5)).toBe(150)
    expect(decimalToCents(19.9)).toBe(1990)
  })

  it('lida com edge cases', () => {
    expect(centsToDecimal(0)).toBe(0)
    expect(decimalToCents(0)).toBe(0)
    expect(centsToDecimal(1)).toBe(0.01)
  })

  it('decimalToCents trunca floats que vêm com erro', () => {
    expect(decimalToCents(0.1 + 0.2)).toBe(30)
  })
})

describe('domainCycleToAsaas', () => {
  it('mapeia monthly → MONTHLY', () => {
    expect(domainCycleToAsaas('monthly')).toBe('MONTHLY')
  })
  it('mapeia yearly → YEARLY', () => {
    expect(domainCycleToAsaas('yearly')).toBe('YEARLY')
  })
})

describe('asaasEventToCanonicalType', () => {
  it('PAYMENT_RECEIVED → PAYMENT_SUCCEEDED', () => {
    expect(asaasEventToCanonicalType('PAYMENT_RECEIVED')).toBe(
      'PAYMENT_SUCCEEDED'
    )
  })
  it('PAYMENT_CONFIRMED → PAYMENT_SUCCEEDED', () => {
    expect(asaasEventToCanonicalType('PAYMENT_CONFIRMED')).toBe(
      'PAYMENT_SUCCEEDED'
    )
  })
  it('PAYMENT_OVERDUE → PAYMENT_FAILED', () => {
    expect(asaasEventToCanonicalType('PAYMENT_OVERDUE')).toBe('PAYMENT_FAILED')
  })
  it('PAYMENT_REFUNDED → PAYMENT_REFUNDED', () => {
    expect(asaasEventToCanonicalType('PAYMENT_REFUNDED')).toBe(
      'PAYMENT_REFUNDED'
    )
  })
  it('SUBSCRIPTION_DELETED → SUBSCRIPTION_CANCELED_BY_PROVIDER', () => {
    expect(asaasEventToCanonicalType('SUBSCRIPTION_DELETED')).toBe(
      'SUBSCRIPTION_CANCELED_BY_PROVIDER'
    )
  })
  it('retorna null pra evento não-mapeado', () => {
    expect(asaasEventToCanonicalType('PAYMENT_DUNNING_REQUESTED')).toBeNull()
    expect(asaasEventToCanonicalType('TRANSFER_CREATED')).toBeNull()
  })
})
