import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'

vi.mock('@repo/env', () => ({
  env: {
    APIBRASIL_DEVICE_TOKEN: 'test-device-token',
    APIBRASIL_BEARER_TOKEN: 'test-bearer-token',
  },
}))

import { ApiBrasilLookupProvider } from './api-brasil-lookup-provider.js'
import {
  LookupProviderUnavailableError,
  PlateNotFoundError,
} from '../domain/vehicle-lookup-errors.js'

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

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

const SUCCESS_BODY = {
  error: false,
  response: {
    marca: 'fiat',
    modelo: 'Mobi Easy 1.0',
    ano: '2019',
    anoModelo: '2020',
    cor: 'Branco',
    combustivel: 'Flex',
    chassi: '9BWZZZ377VT004251',
    placa: 'ABC1D23',
  },
}

describe('ApiBrasilLookupProvider', () => {
  let restoreFetch: (() => void) | undefined

  beforeEach(() => {
    restoreFetch = undefined
  })

  afterEach(() => {
    restoreFetch?.()
    vi.restoreAllMocks()
  })

  describe('credentials not configured', () => {
    it('throws LookupProviderUnavailableError when both tokens are missing', async () => {
      vi.doMock('@repo/env', () => ({
        env: {
          APIBRASIL_DEVICE_TOKEN: undefined,
          APIBRASIL_BEARER_TOKEN: undefined,
        },
      }))
      const { ApiBrasilLookupProvider: Provider } =
        await import('./api-brasil-lookup-provider.js')
      const provider = new Provider()
      await expect(
        provider.lookup({ plate: 'ABC1D23' })
      ).rejects.toBeInstanceOf(LookupProviderUnavailableError)
      vi.doUnmock('@repo/env')
    })
  })

  describe('HTTP error mapping', () => {
    it('maps 404 → PlateNotFoundError', async () => {
      restoreFetch = mockFetch(new Response('not found', { status: 404 }))
      const provider = new ApiBrasilLookupProvider()
      await expect(
        provider.lookup({ plate: 'ABC1D23' })
      ).rejects.toBeInstanceOf(PlateNotFoundError)
    })

    it('maps 500 → LookupProviderUnavailableError', async () => {
      restoreFetch = mockFetch(
        new Response('internal server error', { status: 500 })
      )
      const provider = new ApiBrasilLookupProvider()
      await expect(
        provider.lookup({ plate: 'ABC1D23' })
      ).rejects.toBeInstanceOf(LookupProviderUnavailableError)
    })

    it('maps 401 → LookupProviderUnavailableError', async () => {
      restoreFetch = mockFetch(new Response('unauthorized', { status: 401 }))
      const provider = new ApiBrasilLookupProvider()
      await expect(
        provider.lookup({ plate: 'ABC1D23' })
      ).rejects.toBeInstanceOf(LookupProviderUnavailableError)
    })

    it('maps 403 → LookupProviderUnavailableError', async () => {
      restoreFetch = mockFetch(new Response('forbidden', { status: 403 }))
      const provider = new ApiBrasilLookupProvider()
      await expect(
        provider.lookup({ plate: 'ABC1D23' })
      ).rejects.toBeInstanceOf(LookupProviderUnavailableError)
    })
  })

  describe('network / abort errors', () => {
    it('maps network error → LookupProviderUnavailableError', async () => {
      restoreFetch = mockFetch(async () => {
        throw new TypeError('fetch failed')
      })
      const provider = new ApiBrasilLookupProvider()
      await expect(
        provider.lookup({ plate: 'ABC1D23' })
      ).rejects.toBeInstanceOf(LookupProviderUnavailableError)
    })

    it('maps AbortError (timeout) → LookupProviderUnavailableError', async () => {
      restoreFetch = mockFetch(async () => {
        const err = new Error('The operation was aborted')
        err.name = 'AbortError'
        throw err
      })
      const provider = new ApiBrasilLookupProvider()
      await expect(
        provider.lookup({ plate: 'ABC1D23' })
      ).rejects.toBeInstanceOf(LookupProviderUnavailableError)
    })
  })

  describe('success body with error flag', () => {
    // response must pass Zod schema — omit it (optional) rather than null
    it('detects "não encontrad" message → PlateNotFoundError', async () => {
      restoreFetch = mockFetch(
        jsonResponse({
          error: true,
          message: 'Placa não encontrada no sistema',
        })
      )
      const provider = new ApiBrasilLookupProvider()
      await expect(
        provider.lookup({ plate: 'ABC1D23' })
      ).rejects.toBeInstanceOf(PlateNotFoundError)
    })

    it('detects "nao encontrad" message (no accents) → PlateNotFoundError', async () => {
      restoreFetch = mockFetch(
        jsonResponse({
          error: true,
          message: 'Placa nao encontrada',
        })
      )
      const provider = new ApiBrasilLookupProvider()
      await expect(
        provider.lookup({ plate: 'ABC1D23' })
      ).rejects.toBeInstanceOf(PlateNotFoundError)
    })

    it('maps error:true with non-not-found message → LookupProviderUnavailableError', async () => {
      restoreFetch = mockFetch(
        jsonResponse({
          error: true,
          message: 'Token inválido',
        })
      )
      const provider = new ApiBrasilLookupProvider()
      await expect(
        provider.lookup({ plate: 'ABC1D23' })
      ).rejects.toBeInstanceOf(LookupProviderUnavailableError)
    })
  })

  describe('successful response mapping', () => {
    it('returns correctly mapped VehicleData', async () => {
      restoreFetch = mockFetch(jsonResponse(SUCCESS_BODY))
      const provider = new ApiBrasilLookupProvider()
      const result = await provider.lookup({ plate: 'ABC1D23' })
      expect(result).toEqual({
        brand: 'FIAT',
        model: 'MOBI EASY 1.0',
        manufacturingYear: 2019,
        modelYear: 2020,
        color: 'BRANCO',
        fuelType: 'FLEX',
        chassi: '9BWZZZ377VT004251',
        plate: 'ABC1D23',
      })
    })

    it('normalizes FLEX fuel type', async () => {
      restoreFetch = mockFetch(
        jsonResponse({
          ...SUCCESS_BODY,
          response: {
            ...SUCCESS_BODY.response,
            combustivel: 'Álcool/Gasolina (Flex)',
          },
        })
      )
      const provider = new ApiBrasilLookupProvider()
      const result = await provider.lookup({ plate: 'ABC1D23' })
      expect(result.fuelType).toBe('FLEX')
    })

    it('normalizes ELETR fuel type to ELECTRIC', async () => {
      // Provider checks .toUpperCase().includes('ELETR') — use ASCII spelling
      restoreFetch = mockFetch(
        jsonResponse({
          ...SUCCESS_BODY,
          response: { ...SUCCESS_BODY.response, combustivel: 'Eletrico' },
        })
      )
      const provider = new ApiBrasilLookupProvider()
      const result = await provider.lookup({ plate: 'ABC1D23' })
      expect(result.fuelType).toBe('ELECTRIC')
    })

    it('normalizes HIBRID fuel type to HYBRID', async () => {
      // Provider checks .toUpperCase().includes('HIBRID') — use ASCII spelling
      restoreFetch = mockFetch(
        jsonResponse({
          ...SUCCESS_BODY,
          response: { ...SUCCESS_BODY.response, combustivel: 'Hibrido' },
        })
      )
      const provider = new ApiBrasilLookupProvider()
      const result = await provider.lookup({ plate: 'ABC1D23' })
      expect(result.fuelType).toBe('HYBRID')
    })

    it('returns 0 for unparseable year (string that is not a number)', async () => {
      restoreFetch = mockFetch(
        jsonResponse({
          ...SUCCESS_BODY,
          response: { ...SUCCESS_BODY.response, ano: 'ZERO', anoModelo: 'N/A' },
        })
      )
      const provider = new ApiBrasilLookupProvider()
      const result = await provider.lookup({ plate: 'ABC1D23' })
      expect(result.manufacturingYear).toBe(0)
      expect(result.modelYear).toBe(0)
    })
  })
})
