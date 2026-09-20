import { inject, injectable } from 'tsyringe'
import type { CacheService } from '../../../../shared/cache-service.js'
import { logAudit } from '../../../audit/log-audit.js'
import type { VehicleData } from '../domain/vehicle-data.js'
import {
  InvalidPlateFormatError,
  LookupProviderUnavailableError,
  PlateNotFoundError,
} from '../domain/vehicle-lookup-errors.js'
import type { VehicleLookupProvider } from '../domain/vehicle-lookup-provider.js'
import { buildCacheKey } from './build-cache-key.js'

const CACHE_TTL_SECONDS = 60 * 60 * 24 * 30

export interface LookupVehicleByPlateInput {
  readonly organizationId: string
  readonly userId: string
  readonly plate?: string
  readonly chassi?: string
  readonly proposalId?: string
  readonly ipAddress?: string
  readonly userAgent?: string
}

export interface LookupVehicleByPlateResult {
  readonly data: VehicleData
  readonly source: 'cache' | 'provider'
}

@injectable()
export class LookupVehicleByPlate {
  constructor(
    @inject('VehicleLookupProvider')
    private readonly provider: VehicleLookupProvider,
    @inject('VehicleLookupCacheService')
    private readonly cache: CacheService
  ) {}

  async execute(
    input: LookupVehicleByPlateInput
  ): Promise<LookupVehicleByPlateResult> {
    if (!input.plate && !input.chassi) {
      throw new InvalidPlateFormatError()
    }

    const cacheKey = buildCacheKey({ plate: input.plate, chassi: input.chassi })

    const cached = await this.cache.get<VehicleData>(cacheKey)
    if (cached) {
      await this.audit(input, cacheKey, {
        cacheHit: true,
        found: true,
        providerError: false,
      })
      return { data: cached, source: 'cache' }
    }

    let data: VehicleData
    try {
      data = await this.provider.lookup({
        plate: input.plate,
        chassi: input.chassi,
      })
    } catch (err) {
      if (err instanceof PlateNotFoundError) {
        await this.audit(input, cacheKey, {
          cacheHit: false,
          found: false,
          providerError: false,
        })
        throw err
      }
      await this.audit(input, cacheKey, {
        cacheHit: false,
        found: false,
        providerError: true,
      })
      throw err instanceof LookupProviderUnavailableError
        ? err
        : new LookupProviderUnavailableError()
    }

    await this.cache.set(cacheKey, data, CACHE_TTL_SECONDS)
    await this.audit(input, cacheKey, {
      cacheHit: false,
      found: true,
      providerError: false,
    })

    return { data, source: 'provider' }
  }

  private audit(
    input: LookupVehicleByPlateInput,
    plateHash: string,
    meta: {
      readonly cacheHit: boolean
      readonly found: boolean
      readonly providerError: boolean
    }
  ): Promise<void> {
    return logAudit({
      organizationId: input.organizationId,
      userId: input.userId,
      action: 'VEHICLE_LOOKUP',
      entityType: 'PROPOSAL',
      entityId: input.proposalId,
      after: {
        plateHash,
        provider: this.provider.name,
        cacheHit: meta.cacheHit,
        found: meta.found,
        providerError: meta.providerError,
      },
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    })
  }
}
