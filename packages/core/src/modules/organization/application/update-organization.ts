import { inject, injectable } from 'tsyringe'
import type { CacheService } from '../../../shared/cache-service.js'
import type { StorageProvider } from '../../../platform/storage/storage-provider.js'
import type {
  OrganizationData,
  OrganizationRepository,
} from '../domain/organization-repository.js'
import type { OrganizationView } from '../domain/organization-view.js'
import {
  OrganizationNotFoundError,
  SlugConflictError,
} from '../domain/organization-errors.js'

interface UpdateOrganizationInput {
  organizationId: string
  name: string
  slug: string
}

interface UpdateOrganizationResult {
  view: OrganizationView
  before: { name: string; slug: string }
}

@injectable()
export class UpdateOrganization {
  constructor(
    @inject('OrganizationRepository')
    private readonly orgRepo: OrganizationRepository,
    @inject('CacheService') private readonly cache: CacheService,
    @inject('StorageProvider') private readonly storage: StorageProvider
  ) {}

  async execute(
    input: UpdateOrganizationInput
  ): Promise<UpdateOrganizationResult> {
    await this.assertSlugAvailable(input.organizationId, input.slug)
    const beforeOrg = await this.orgRepo.findById(input.organizationId)
    if (!beforeOrg) {
      throw new OrganizationNotFoundError(input.organizationId)
    }
    const before = { name: beforeOrg.name, slug: beforeOrg.slug }
    const updated = await this.orgRepo.update(input.organizationId, {
      name: input.name,
      slug: input.slug,
    })
    await this.cache.delete(`cache:${input.organizationId}:org`)
    const view = await this.toView(updated)
    return { view, before }
  }

  private async assertSlugAvailable(
    organizationId: string,
    slug: string
  ): Promise<void> {
    const taken = await this.orgRepo.slugTakenByAnother(organizationId, slug)
    if (taken) {
      throw new SlugConflictError(slug)
    }
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
}
