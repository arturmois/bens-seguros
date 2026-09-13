import { inject, injectable } from 'tsyringe'
import { cacheAside } from '../../../../shared/cache-aside.js'
import type { CacheService } from '../../../../shared/cache-service.js'
import type { StorageProvider } from '../../../../platform/storage/storage-provider.js'
import type { OrganizationRepository } from '../domain/organization-repository.js'
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
    const cacheRecord = await cacheAside<OrgCacheRecord>(
      this.cache,
      `cache:${organizationId}:org`,
      ORG_CACHE_TTL_SECONDS,
      () => this.fetchAndProject(organizationId)
    )
    return this.toView(cacheRecord)
  }

  private async fetchAndProject(
    organizationId: string
  ): Promise<OrgCacheRecord> {
    const org = await this.orgRepo.findById(organizationId)
    if (!org) {
      throw new OrganizationNotFoundError(organizationId)
    }
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      logoKey: org.logo,
      createdAt: org.createdAt.toISOString(),
    }
  }

  private async toView(record: OrgCacheRecord): Promise<OrganizationView> {
    const logo = record.logoKey
      ? await this.storage.getSignedUrl(record.logoKey)
      : null
    return {
      id: record.id,
      name: record.name,
      slug: record.slug,
      logo,
      createdAt: new Date(record.createdAt),
    }
  }
}
