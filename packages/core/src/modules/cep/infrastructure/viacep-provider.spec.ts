import { describe, it, expect, vi, afterEach } from 'vitest'
import { ViaCepProvider } from './viacep-provider.js'
import { CepProviderUnavailableError } from '../domain/errors.js'

function mockFetch(response: Response | (() => Promise<Response>)): () => void {
  const fetchMock = vi
    .fn()
    .mockImplementation(
      typeof response === 'function' ? response : async () => response
    )
  const original = globalThis.fetch
  globalThis.fetch = fetchMock as typeof fetch
  return () => {
    globalThis.fetch = original
  }
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  })
}

describe('ViaCepProvider', () => {
  let restoreFetch: (() => void) | undefined

  afterEach(() => {
    restoreFetch?.()
    restoreFetch = undefined
  })

  it('maps ViaCEP response to AddressData', async () => {
    restoreFetch = mockFetch(
      jsonResponse({
        cep: '01311-000',
        logradouro: 'Avenida Paulista',
        complemento: 'de 1578 ao fim - lado par',
        bairro: 'Bela Vista',
        localidade: 'São Paulo',
        uf: 'SP',
      })
    )
    const provider = new ViaCepProvider()
    const result = await provider.lookup('01311000')
    expect(result).toEqual({
      zipCode: '01311000',
      street: 'Avenida Paulista',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      complement: 'de 1578 ao fim - lado par',
    })
  })

  it('returns null when ViaCEP responds with { erro: true }', async () => {
    restoreFetch = mockFetch(jsonResponse({ erro: true }))
    const provider = new ViaCepProvider()
    const result = await provider.lookup('00000000')
    expect(result).toBeNull()
  })

  it('normalizes empty complement to null', async () => {
    restoreFetch = mockFetch(
      jsonResponse({
        cep: '01311-000',
        logradouro: 'Avenida Paulista',
        complemento: '',
        bairro: 'Bela Vista',
        localidade: 'São Paulo',
        uf: 'SP',
      })
    )
    const provider = new ViaCepProvider()
    const result = await provider.lookup('01311000')
    expect(result?.complement).toBeNull()
  })

  it('throws CepProviderUnavailableError on non-200 response', async () => {
    restoreFetch = mockFetch(new Response('bad gateway', { status: 502 }))
    const provider = new ViaCepProvider()
    await expect(provider.lookup('01311000')).rejects.toBeInstanceOf(
      CepProviderUnavailableError
    )
  })

  it('throws CepProviderUnavailableError on network failure', async () => {
    restoreFetch = mockFetch(async () => {
      throw new TypeError('fetch failed')
    })
    const provider = new ViaCepProvider()
    await expect(provider.lookup('01311000')).rejects.toBeInstanceOf(
      CepProviderUnavailableError
    )
  })

  it('throws CepProviderUnavailableError on timeout (AbortError)', async () => {
    restoreFetch = mockFetch(async () => {
      const error = new Error('The operation was aborted')
      error.name = 'AbortError'
      throw error
    })
    const provider = new ViaCepProvider()
    await expect(provider.lookup('01311000')).rejects.toBeInstanceOf(
      CepProviderUnavailableError
    )
  })

  it('throws CepProviderUnavailableError when ViaCEP returns a malformed UF', async () => {
    restoreFetch = mockFetch(
      jsonResponse({
        cep: '01311-000',
        logradouro: 'Avenida Paulista',
        complemento: '',
        bairro: 'Bela Vista',
        localidade: 'São Paulo',
        uf: '',
      })
    )
    const provider = new ViaCepProvider()
    await expect(provider.lookup('01311000')).rejects.toBeInstanceOf(
      CepProviderUnavailableError
    )
  })
})
