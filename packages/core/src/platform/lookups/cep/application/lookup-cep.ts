import { inject, injectable } from 'tsyringe'
import type { CacheService } from '../../../../shared/cache-service.js'
import type { AddressData } from '../domain/address-data.js'
import type { CepLookupProvider } from '../domain/cep-lookup-provider.js'
import { CepNotFoundError, InvalidCepError } from '../domain/errors.js'

const CACHE_KEY_PREFIX = 'cep:'
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 30

interface LookupCepInput {
  readonly cep: string
}

@injectable()
export class LookupCep {
  constructor(
    @inject('CepLookupProvider')
    private readonly provider: CepLookupProvider,
    @inject('CepCacheService')
    private readonly cache: CacheService
  ) {}

  async execute(input: LookupCepInput): Promise<AddressData> {
    const normalized = input.cep.replace(/\D/g, '')
    if (normalized.length !== 8) {
      throw new InvalidCepError()
    }
    const cacheKey = `${CACHE_KEY_PREFIX}${normalized}`
    const cached = await this.cache.get<AddressData>(cacheKey)
    if (cached) {
      return cached
    }
    const result = await this.provider.lookup(normalized)
    if (!result) {
      throw new CepNotFoundError()
    }
    await this.cache.set(cacheKey, result, CACHE_TTL_SECONDS)
    return result
  }
}
