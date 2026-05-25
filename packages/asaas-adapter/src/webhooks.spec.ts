import { describe, expect, it } from 'vitest'
import {
  BillingProviderAuthError,
  BillingProviderInvalidRequestError,
} from '@repo/billing-port'
import { validateAndParseWebhook } from './webhooks'

const SECRET = 'super-secret-current-32chars-long'
const PREV_SECRET = 'super-secret-previous-32chars-l'

const validBody = JSON.stringify({
  id: 'evt_001',
  event: 'PAYMENT_RECEIVED',
  dateCreated: '2026-05-25 10:00:00',
  payment: {
    object: 'payment',
    id: 'pay_001',
    customer: 'cus_001',
    subscription: 'sub_001',
    value: 299,
    netValue: 290,
    billingType: 'BOLETO',
    status: 'CONFIRMED',
    dueDate: '2026-05-25',
    paymentDate: '2026-05-25',
  },
})

describe('validateAndParseWebhook', () => {
  it('aceita token current válido', () => {
    const event = validateAndParseWebhook(
      validBody,
      { 'asaas-access-token': SECRET },
      { currentSecret: SECRET }
    )
    expect(event.type).toBe('PAYMENT_SUCCEEDED')
    if (event.type === 'PAYMENT_SUCCEEDED') {
      expect(event.amountCents).toBe(29900)
      expect(event.providerCustomerId).toBe('cus_001')
      expect(event.providerSubscriptionId).toBe('sub_001')
    }
  })

  it('aceita token previous durante rotation window', () => {
    const event = validateAndParseWebhook(
      validBody,
      { 'asaas-access-token': PREV_SECRET },
      { currentSecret: SECRET, previousSecret: PREV_SECRET }
    )
    expect(event.type).toBe('PAYMENT_SUCCEEDED')
  })

  it('rejeita token inválido com BillingProviderAuthError', () => {
    expect(() =>
      validateAndParseWebhook(
        validBody,
        { 'asaas-access-token': 'wrong-token' },
        { currentSecret: SECRET }
      )
    ).toThrow(BillingProviderAuthError)
  })

  it('rejeita header ausente', () => {
    expect(() =>
      validateAndParseWebhook(validBody, {}, { currentSecret: SECRET })
    ).toThrow(BillingProviderAuthError)
  })

  it('lê header case-insensitive', () => {
    const event = validateAndParseWebhook(
      validBody,
      { 'Asaas-Access-Token': SECRET },
      { currentSecret: SECRET }
    )
    expect(event.type).toBe('PAYMENT_SUCCEEDED')
  })

  it('mapeia PAYMENT_OVERDUE → PAYMENT_FAILED', () => {
    const body = JSON.stringify({
      id: 'evt_002',
      event: 'PAYMENT_OVERDUE',
      payment: {
        object: 'payment',
        id: 'pay_002',
        customer: 'cus_001',
        subscription: 'sub_001',
        value: 299,
        billingType: 'BOLETO',
        status: 'OVERDUE',
        dueDate: '2026-05-25',
      },
    })
    const event = validateAndParseWebhook(
      body,
      { 'asaas-access-token': SECRET },
      { currentSecret: SECRET }
    )
    expect(event.type).toBe('PAYMENT_FAILED')
  })

  it('mapeia PAYMENT_REFUNDED → PAYMENT_REFUNDED', () => {
    const body = JSON.stringify({
      id: 'evt_003',
      event: 'PAYMENT_REFUNDED',
      payment: {
        object: 'payment',
        id: 'pay_003',
        customer: 'cus_001',
        subscription: 'sub_001',
        value: 299,
        billingType: 'BOLETO',
        status: 'REFUNDED',
        dueDate: '2026-05-25',
      },
    })
    const event = validateAndParseWebhook(
      body,
      { 'asaas-access-token': SECRET },
      { currentSecret: SECRET }
    )
    expect(event.type).toBe('PAYMENT_REFUNDED')
  })

  it('mapeia SUBSCRIPTION_DELETED → SUBSCRIPTION_CANCELED_BY_PROVIDER', () => {
    const body = JSON.stringify({
      id: 'evt_004',
      event: 'SUBSCRIPTION_DELETED',
      subscription: {
        object: 'subscription',
        id: 'sub_001',
        customer: 'cus_001',
        billingType: 'BOLETO',
        value: 299,
        nextDueDate: '2026-06-25',
        cycle: 'MONTHLY',
        status: 'INACTIVE',
      },
    })
    const event = validateAndParseWebhook(
      body,
      { 'asaas-access-token': SECRET },
      { currentSecret: SECRET }
    )
    expect(event.type).toBe('SUBSCRIPTION_CANCELED_BY_PROVIDER')
  })

  it('throws InvalidRequestError em payload malformado', () => {
    expect(() =>
      validateAndParseWebhook(
        'not-json',
        { 'asaas-access-token': SECRET },
        { currentSecret: SECRET }
      )
    ).toThrow(BillingProviderInvalidRequestError)
  })

  it('rejeita PAYMENT_RECEIVED sem subscription reference', () => {
    const body = JSON.stringify({
      id: 'evt_no_sub',
      event: 'PAYMENT_RECEIVED',
      payment: {
        object: 'payment',
        id: 'pay_no_sub',
        customer: 'cus_001',
        value: 50,
        billingType: 'BOLETO',
        status: 'CONFIRMED',
        dueDate: '2026-05-25',
      },
    })
    expect(() =>
      validateAndParseWebhook(
        body,
        { 'asaas-access-token': SECRET },
        { currentSecret: SECRET }
      )
    ).toThrow(BillingProviderInvalidRequestError)
  })

  it('rejeita token de tamanho diferente em constant time (hash compare)', () => {
    const short = 'short'
    expect(() =>
      validateAndParseWebhook(
        validBody,
        { 'asaas-access-token': short },
        { currentSecret: SECRET }
      )
    ).toThrow(BillingProviderAuthError)
  })

  it('throws InvalidRequestError em evento não-mapeado', () => {
    const body = JSON.stringify({
      id: 'evt_005',
      event: 'TRANSFER_CREATED',
    })
    expect(() =>
      validateAndParseWebhook(
        body,
        { 'asaas-access-token': SECRET },
        { currentSecret: SECRET }
      )
    ).toThrow(BillingProviderInvalidRequestError)
  })
})
