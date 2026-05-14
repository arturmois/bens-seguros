import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../audit/log-audit.js', () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}))

import { logAudit } from '../../audit/log-audit.js'
import { LookupVehicleByPlate } from './lookup-vehicle-by-plate.js'
import {
  InvalidPlateFormatError,
  LookupProviderUnavailableError,
  PlateNotFoundError,
} from '../domain/vehicle-lookup-errors.js'
import type { VehicleData } from '../domain/vehicle-data.js'
import type { VehicleLookupProvider } from '../domain/vehicle-lookup-provider.js'
import type { CacheService } from '../../../shared/cache-service.js'

const DATA: VehicleData = {
  brand: 'FIAT',
  model: 'MOBI EASY 1.0',
  manufacturingYear: 2019,
  modelYear: 2020,
  color: 'BRANCO',
  fuelType: 'FLEX',
  chassi: '9BWZZZ377VT004251',
  plate: 'ABC1D23',
}

function makeProvider(): VehicleLookupProvider {
  return { name: 'consultar-placa', lookup: vi.fn() }
}

function makeCache(): CacheService {
  return { get: vi.fn(), set: vi.fn(), delete: vi.fn() }
}

const BASE_INPUT = {
  organizationId: 'org-1',
  userId: 'user-1',
  plate: 'ABC1D23',
  proposalId: 'proposal-1',
  ipAddress: '127.0.0.1',
  userAgent: 'vitest',
}

describe('LookupVehicleByPlate', () => {
  let provider: VehicleLookupProvider
  let cache: CacheService
  let useCase: LookupVehicleByPlate

  beforeEach(() => {
    vi.mocked(logAudit).mockClear()
    provider = makeProvider()
    cache = makeCache()
    useCase = new LookupVehicleByPlate(provider, cache)
  })

  it('returns from cache when hit and does not call provider', async () => {
    vi.mocked(cache.get).mockResolvedValue(DATA)
    const result = await useCase.execute(BASE_INPUT)
    expect(result).toEqual({ data: DATA, source: 'cache' })
    expect(provider.lookup).not.toHaveBeenCalled()
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'VEHICLE_LOOKUP',
        entityType: 'PROPOSAL',
        entityId: 'proposal-1',
        after: expect.objectContaining({
          cacheHit: true,
          found: true,
          providerError: false,
        }),
      })
    )
  })

  it('calls provider on miss, persists in cache, and returns data', async () => {
    vi.mocked(cache.get).mockResolvedValue(null)
    vi.mocked(provider.lookup).mockResolvedValue(DATA)
    const result = await useCase.execute(BASE_INPUT)
    expect(result).toEqual({ data: DATA, source: 'provider' })
    expect(provider.lookup).toHaveBeenCalledWith({
      plate: 'ABC1D23',
      chassi: undefined,
    })
    expect(cache.set).toHaveBeenCalledWith(
      expect.stringMatching(/^vlookup:/),
      DATA,
      60 * 60 * 24 * 30
    )
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        after: expect.objectContaining({
          cacheHit: false,
          found: true,
          providerError: false,
        }),
      })
    )
  })

  it('propagates PlateNotFoundError without caching', async () => {
    vi.mocked(cache.get).mockResolvedValue(null)
    vi.mocked(provider.lookup).mockRejectedValue(new PlateNotFoundError())
    await expect(useCase.execute(BASE_INPUT)).rejects.toBeInstanceOf(
      PlateNotFoundError
    )
    expect(cache.set).not.toHaveBeenCalled()
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        after: expect.objectContaining({
          cacheHit: false,
          found: false,
          providerError: false,
        }),
      })
    )
  })

  it('audits and propagates LookupProviderUnavailableError', async () => {
    vi.mocked(cache.get).mockResolvedValue(null)
    vi.mocked(provider.lookup).mockRejectedValue(
      new LookupProviderUnavailableError()
    )
    await expect(useCase.execute(BASE_INPUT)).rejects.toBeInstanceOf(
      LookupProviderUnavailableError
    )
    expect(cache.set).not.toHaveBeenCalled()
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        after: expect.objectContaining({
          cacheHit: false,
          found: false,
          providerError: true,
        }),
      })
    )
  })

  it('rejects when neither plate nor chassi provided', async () => {
    await expect(
      useCase.execute({ ...BASE_INPUT, plate: undefined, chassi: undefined })
    ).rejects.toBeInstanceOf(InvalidPlateFormatError)
    expect(provider.lookup).not.toHaveBeenCalled()
    expect(cache.get).not.toHaveBeenCalled()
  })

  it('uses different cache keys for plate vs chassi searches', async () => {
    vi.mocked(cache.get).mockResolvedValue(null)
    vi.mocked(provider.lookup).mockResolvedValue(DATA)

    await useCase.execute({
      ...BASE_INPUT,
      plate: 'ABC1D23',
      chassi: undefined,
    })
    await useCase.execute({
      ...BASE_INPUT,
      plate: undefined,
      chassi: 'ABC1D23XXXXXXXXXX',
    })

    const calls = vi.mocked(cache.get).mock.calls
    const [firstCall, secondCall] = calls
    expect(firstCall?.[0]).not.toBe(secondCall?.[0])
  })
})
