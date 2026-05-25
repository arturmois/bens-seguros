import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  BillingProviderAuthError,
  BillingProviderInvalidRequestError,
  BillingProviderNetworkError,
  BillingProviderRateLimitError,
} from '@repo/billing-port'
import { AsaasClient } from './client'
import { firstFetchCall } from './test-helpers'

const okResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })

const errorResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

describe('AsaasClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('usa base URL sandbox quando env=sandbox', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse({ id: 'cus_x' }))
    const client = new AsaasClient({
      env: 'sandbox',
      apiKey: '$aact_test',
      fetch: fetchMock,
    })

    await client.post('/v3/customers', { name: 'X', email: 'x@y.z' })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api-sandbox.asaas.com/v3/customers',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          access_token: '$aact_test',
          'content-type': 'application/json',
        }),
      })
    )
  })

  it('usa base URL prod quando env=production', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse({ id: 'cus_x' }))
    const client = new AsaasClient({
      env: 'production',
      apiKey: '$aact_prod',
      fetch: fetchMock,
    })

    await client.get('/v3/customers/cus_x')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.asaas.com/v3/customers/cus_x',
      expect.any(Object)
    )
  })

  it('serializa body como JSON em POST', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse({ id: 'cus_x' }))
    const client = new AsaasClient({
      env: 'sandbox',
      apiKey: '$aact',
      fetch: fetchMock,
    })

    await client.post('/v3/customers', { name: 'João', email: 'j@y.z' })

    const { init } = firstFetchCall(fetchMock)
    expect(init.body).toBe('{"name":"João","email":"j@y.z"}')
  })

  it('401 vira BillingProviderAuthError', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      errorResponse(401, {
        errors: [
          { code: 'invalid_access_token', description: 'API key invalida' },
        ],
      })
    )
    const client = new AsaasClient({
      env: 'sandbox',
      apiKey: '$aact',
      fetch: fetchMock,
    })

    await expect(client.get('/v3/customers')).rejects.toBeInstanceOf(
      BillingProviderAuthError
    )
  })

  it('400 vira BillingProviderInvalidRequestError com validationErrors', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      errorResponse(400, {
        errors: [
          { code: 'invalid_email', description: 'email invalido' },
          { code: 'invalid_phone', description: 'telefone invalido' },
        ],
      })
    )
    const client = new AsaasClient({
      env: 'sandbox',
      apiKey: '$aact',
      fetch: fetchMock,
    })

    try {
      await client.post('/v3/customers', { name: 'X' })
      expect.fail('should have thrown')
    } catch (err) {
      if (!(err instanceof BillingProviderInvalidRequestError)) {
        expect.fail('expected BillingProviderInvalidRequestError')
        return
      }
      expect(err.validationErrors).toEqual({
        invalid_email: 'email invalido',
        invalid_phone: 'telefone invalido',
      })
    }
  })

  it('429 vira BillingProviderRateLimitError com retryAfterSeconds', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          errors: [{ code: 'rate_limit', description: 'slow down' }],
        }),
        {
          status: 429,
          headers: { 'content-type': 'application/json', 'retry-after': '30' },
        }
      )
    )
    const client = new AsaasClient({
      env: 'sandbox',
      apiKey: '$aact',
      fetch: fetchMock,
    })

    try {
      await client.get('/v3/customers')
      expect.fail('should have thrown')
    } catch (err) {
      if (!(err instanceof BillingProviderRateLimitError)) {
        expect.fail('expected BillingProviderRateLimitError')
        return
      }
      expect(err.retryAfterSeconds).toBe(30)
    }
  })

  it('fetch reject (rede) vira BillingProviderNetworkError', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('fetch failed'))
    const client = new AsaasClient({
      env: 'sandbox',
      apiKey: '$aact',
      fetch: fetchMock,
    })

    await expect(client.get('/v3/customers')).rejects.toBeInstanceOf(
      BillingProviderNetworkError
    )
  })
})
