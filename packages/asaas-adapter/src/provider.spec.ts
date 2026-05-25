import { describe, expect, it, vi } from 'vitest'
import { BillingProviderError } from '@repo/billing-port'
import { AsaasBillingProvider } from './provider'

const okResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })

describe('AsaasBillingProvider', () => {
  it('expõe createCustomer delegando pro module', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      okResponse({
        object: 'customer',
        id: 'cus_x',
        name: 'X',
        email: 'x@example.com',
      })
    )
    const provider = new AsaasBillingProvider({
      env: 'sandbox',
      apiKey: '$a',
      webhookSecretCurrent: 'super-secret-current-32chars-long',
      fetch: fetchMock,
    })

    const ref = await provider.createCustomer({
      name: 'X',
      email: 'x@example.com',
    })
    expect(ref.provider).toBe('asaas')
    expect(ref.externalId).toBe('cus_x')
  })

  it('tokenizeCard throws (hosted checkout MVP)', async () => {
    const provider = new AsaasBillingProvider({
      env: 'sandbox',
      apiKey: '$a',
      webhookSecretCurrent: 'super-secret-current-32chars-long',
    })

    await expect(
      provider.tokenizeCard({
        customerRef: { provider: 'asaas', externalId: 'cus_x' },
        providerPaymentMethodId: 'pm_x',
      })
    ).rejects.toThrow(BillingProviderError)
  })

  it('validateAndParseWebhook usa webhookSecret configurado', () => {
    const provider = new AsaasBillingProvider({
      env: 'sandbox',
      apiKey: '$a',
      webhookSecretCurrent: 'my-secret-32chars-long-aaaaaa',
    })

    const body = JSON.stringify({
      id: 'evt_x',
      event: 'PAYMENT_RECEIVED',
      payment: {
        object: 'payment',
        id: 'pay_x',
        customer: 'cus_x',
        subscription: 'sub_x',
        value: 100,
        billingType: 'BOLETO',
        status: 'CONFIRMED',
        dueDate: '2026-05-25',
      },
    })

    const event = provider.validateAndParseWebhook(body, {
      'asaas-access-token': 'my-secret-32chars-long-aaaaaa',
    })
    expect(event.type).toBe('PAYMENT_SUCCEEDED')
  })
})
