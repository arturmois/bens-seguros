import { inject, injectable } from 'tsyringe'
import type { CacheService } from '../../../shared/cache-service.js'
import type { StorageProvider } from '../../document/domain/storage-provider.js'
import type {
  OrganizationData,
  OrganizationRepository,
} from '../domain/organization-repository.js'
import type { OrganizationView } from '../domain/organization-view.js'
import { OrganizationNotFoundError } from '../domain/organization-errors.js'

interface OrgCacheRecord {
  id: string
  name: string
  slug: string
  logoKey: string | null
  createdAt: string
}

const ORG_CACHE_TTL_SECONDS = 3600

@injectable()
export class GetOrganization {
  constructor(
    @inject('OrganizationRepository')
    private readonly orgRepo: OrganizationRepository,
    @inject('CacheService') private readonly cache: CacheService,
    @inject('StorageProvider') private readonly storage: StorageProvider
  ) {}

  async execute(organizationId: string): Promise<OrganizationView> {
    const cacheKey = `cache:${organizationId}:org`
    const cached = await this.cache.get<OrgCacheRecord>(cacheKey)
    if (cached) {
      return this.toViewFromCache(cached)
    }
    const org = await this.orgRepo.findById(organizationId)
    if (!org) {
      throw new OrganizationNotFoundError(organizationId)
    }
    await this.cache.set(
      cacheKey,
      {
        id: org.id,
        name: org.name,
        slug: org.slug,
        logoKey: org.logo,
        createdAt: org.createdAt.toISOString(),
      } satisfies OrgCacheRecord,
      ORG_CACHE_TTL_SECONDS
    )
    return this.toView(org)
  }

  private async toView(org: OrganizationData): Promise<OrganizationView> {
    const logo = org.logo ? await this.storage.getSignedUrl(org.logo) : null
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      logo,
      createdAt: org.createdAt,
    }
  }

  private async toViewFromCache(
    cached: OrgCacheRecord
  ): Promise<OrganizationView> {
    const logo = cached.logoKey
      ? await this.storage.getSignedUrl(cached.logoKey)
      : null
    return {
      id: cached.id,
      name: cached.name,
      slug: cached.slug,
      logo,
      createdAt: new Date(cached.createdAt),
    }
  }
}
