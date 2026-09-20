import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LookupCep } from './lookup-cep.js'
import type { CepLookupProvider } from '../domain/cep-lookup-provider.js'
import type { CacheService } from '../../../../shared/cache-service.js'
import type { AddressData } from '../domain/address-data.js'
import {
  CepNotFoundError,
  CepProviderUnavailableError,
  InvalidCepError,
} from '../domain/errors.js'

const cached: AddressData = {
  zipCode: '01311000',
  street: 'Avenida Paulista',
  neighborhood: 'Bela Vista',
  city: 'São Paulo',
  state: 'SP',
  complement: null,
}

function makeCache(overrides: Partial<CacheService> = {}): CacheService {
  return {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function makeProvider(
  overrides: Partial<CepLookupProvider> = {}
): CepLookupProvider {
  return {
    lookup: vi.fn().mockResolvedValue(null),
    ...overrides,
  }
}

describe('LookupCep', () => {
  let cache: CacheService
  let provider: CepLookupProvider
  let useCase: LookupCep
  beforeEach(() => {
    cache = makeCache()
    provider = makeProvider()
    useCase = new LookupCep(provider, cache)
  })
  it('rejects CEPs with less than 8 digits', async () => {
    await expect(useCase.execute({ cep: '1234' })).rejects.toBeInstanceOf(
      InvalidCepError
    )
  })
  it('normalizes CEP by stripping non-digits before cache lookup', async () => {
    cache.get = vi.fn().mockResolvedValue(cached)
    const result = await useCase.execute({ cep: '01311-000' })
    expect(cache.get).toHaveBeenCalledWith('cep:01311000')
    expect(result).toEqual(cached)
  })
  it('returns cached AddressData on cache hit without calling provider', async () => {
    cache.get = vi.fn().mockResolvedValue(cached)
    const result = await useCase.execute({ cep: '01311000' })
    expect(result).toEqual(cached)
    expect(provider.lookup).not.toHaveBeenCalled()
  })
  it('fetches from provider on cache miss and caches the result for 30 days', async () => {
    provider.lookup = vi.fn().mockResolvedValue(cached)
    const result = await useCase.execute({ cep: '01311000' })
    expect(result).toEqual(cached)
    expect(provider.lookup).toHaveBeenCalledWith('01311000')
    expect(cache.set).toHaveBeenCalledWith('cep:01311000', cached, 2592000)
  })
  it('throws CepNotFoundError when provider returns null and does not cache', async () => {
    provider.lookup = vi.fn().mockResolvedValue(null)
    await expect(useCase.execute({ cep: '00000000' })).rejects.toBeInstanceOf(
      CepNotFoundError
    )
    expect(cache.set).not.toHaveBeenCalled()
  })
  it('propagates CepProviderUnavailableError when provider throws', async () => {
    provider.lookup = vi
      .fn()
      .mockRejectedValue(new CepProviderUnavailableError())
    await expect(useCase.execute({ cep: '01311000' })).rejects.toBeInstanceOf(
      CepProviderUnavailableError
    )
    expect(cache.set).not.toHaveBeenCalled()
  })
})
