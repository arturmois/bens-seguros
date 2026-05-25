import { describe, expect, it, vi } from 'vitest'
import {
  createSubscription,
  cancelSubscription,
  changeSubscriptionPlan,
} from './subscriptions'
import { AsaasClient } from './client'
import { firstFetchBody } from './test-helpers'

const okResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })

const customerRef = {
  provider: 'asaas' as const,
  externalId: 'cus_000005401844',
}

const planRef = {
  provider: 'asaas' as const,
  priceCents: 29900,
  currency: 'BRL',
  billingPeriod: 'monthly' as const,
}

describe('createSubscription', () => {
  it('chama POST /v3/subscriptions com body mapeado (cents → decimal, monthly → MONTHLY, billingType BOLETO default)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      okResponse({
        object: 'subscription',
        id: 'sub_abc123',
        customer: 'cus_000005401844',
        billingType: 'BOLETO',
        value: 299,
        nextDueDate: '2026-06-25',
        cycle: 'MONTHLY',
        status: 'ACTIVE',
      })
    )
    const client = new AsaasClient({
      env: 'sandbox',
      apiKey: '$a',
      fetch: fetchMock,
    })

    const ref = await createSubscription(client, {
      customerRef,
      planRef,
    })

    const sentBody = firstFetchBody(fetchMock)
    expect(sentBody.customer).toBe('cus_000005401844')
    expect(sentBody.value).toBe(299)
    expect(sentBody.cycle).toBe('MONTHLY')
    expect(sentBody.billingType).toBe('BOLETO')
    expect(sentBody.nextDueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    expect(ref).toEqual({
      provider: 'asaas',
      externalId: 'sub_abc123',
      customerRef,
    })
  })

  it('rejeita priceCents float (via PlanRefSchema)', async () => {
    const client = new AsaasClient({
      env: 'sandbox',
      apiKey: '$a',
      fetch: vi.fn(),
    })

    await expect(
      createSubscription(client, {
        customerRef,
        planRef: { ...planRef, priceCents: 299.5 },
      })
    ).rejects.toThrow()
  })

  it('usa trialEndsAt como nextDueDate quando fornecido', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      okResponse({
        object: 'subscription',
        id: 'sub_xxx',
        customer: 'cus_000005401844',
        billingType: 'BOLETO',
        value: 299,
        nextDueDate: '2026-07-15',
        cycle: 'MONTHLY',
        status: 'ACTIVE',
      })
    )
    const client = new AsaasClient({
      env: 'sandbox',
      apiKey: '$a',
      fetch: fetchMock,
    })

    await createSubscription(client, {
      customerRef,
      planRef,
      trialEndsAt: new Date('2026-07-15T00:00:00.000Z'),
    })

    const sentBody = firstFetchBody(fetchMock)
    expect(sentBody.nextDueDate).toBe('2026-07-15')
  })
})

describe('cancelSubscription', () => {
  it('chama DELETE /v3/subscriptions/{id}', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(okResponse({ deleted: true, id: 'sub_abc' }))
    const client = new AsaasClient({
      env: 'sandbox',
      apiKey: '$a',
      fetch: fetchMock,
    })

    await cancelSubscription(client, {
      provider: 'asaas',
      externalId: 'sub_abc',
      customerRef,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api-sandbox.asaas.com/v3/subscriptions/sub_abc',
      expect.objectContaining({ method: 'DELETE' })
    )
  })
})

describe('changeSubscriptionPlan', () => {
  it('chama POST /v3/subscriptions/{id} com novo value+cycle', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      okResponse({
        object: 'subscription',
        id: 'sub_abc',
        customer: 'cus_000005401844',
        billingType: 'BOLETO',
        value: 699,
        nextDueDate: '2026-07-01',
        cycle: 'MONTHLY',
        status: 'ACTIVE',
      })
    )
    const client = new AsaasClient({
      env: 'sandbox',
      apiKey: '$a',
      fetch: fetchMock,
    })

    const ref = await changeSubscriptionPlan(
      client,
      { provider: 'asaas', externalId: 'sub_abc', customerRef },
      { ...planRef, priceCents: 69900 }
    )

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api-sandbox.asaas.com/v3/subscriptions/sub_abc',
      expect.objectContaining({ method: 'POST' })
    )

    const sentBody = firstFetchBody(fetchMock)
    expect(sentBody.value).toBe(699)
    expect(sentBody.cycle).toBe('MONTHLY')

    expect(ref.externalId).toBe('sub_abc')
  })
})
