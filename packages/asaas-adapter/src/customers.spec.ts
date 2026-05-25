import { describe, expect, it, vi } from 'vitest'
import { createCustomer } from './customers'
import { AsaasClient } from './client'
import { firstFetchBody } from './test-helpers'

const okResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })

describe('createCustomer', () => {
  it('chama POST /v3/customers com body mapeado', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      okResponse({
        object: 'customer',
        id: 'cus_000005401844',
        name: 'João Silva',
        email: 'joao@example.com',
      })
    )
    const client = new AsaasClient({
      env: 'sandbox',
      apiKey: '$aact',
      fetch: fetchMock,
    })

    const ref = await createCustomer(client, {
      name: 'João Silva',
      email: 'joao@example.com',
      taxId: '12345678900',
      externalRef: 'org_abc',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api-sandbox.asaas.com/v3/customers',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"cpfCnpj":"12345678900"'),
      })
    )
    expect(ref).toEqual({ provider: 'asaas', externalId: 'cus_000005401844' })
  })

  it('omite cpfCnpj quando taxId não fornecido', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      okResponse({
        object: 'customer',
        id: 'cus_xxx',
        name: 'X',
        email: 'x@example.com',
      })
    )
    const client = new AsaasClient({
      env: 'sandbox',
      apiKey: '$a',
      fetch: fetchMock,
    })

    await createCustomer(client, { name: 'X', email: 'x@example.com' })

    const sentBody = firstFetchBody(fetchMock)
    expect(sentBody).not.toHaveProperty('cpfCnpj')
  })

  it('inclui externalReference quando externalRef fornecido', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      okResponse({
        object: 'customer',
        id: 'cus_xxx',
        name: 'X',
        email: 'x@example.com',
      })
    )
    const client = new AsaasClient({
      env: 'sandbox',
      apiKey: '$a',
      fetch: fetchMock,
    })

    await createCustomer(client, {
      name: 'X',
      email: 'x@example.com',
      externalRef: 'org_123',
    })

    const sentBody = firstFetchBody(fetchMock)
    expect(sentBody.externalReference).toBe('org_123')
  })
})
