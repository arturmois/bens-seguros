import pino from 'pino'
import { inject, injectable } from 'tsyringe'
import type { CacheService } from '../../../shared/cache-service.js'
import type { StorageProvider } from '../../../platform/storage/storage-provider.js'
import type {
  OrganizationData,
  OrganizationRepository,
} from '../domain/organization-repository.js'
import type { OrganizationView } from '../domain/organization-view.js'
import { assertValidLogoUpload, logoStorageKey } from '../domain/logo-policy.js'

const logger = pino({ name: 'organization-upload-logo' })

interface UploadLogoInput {
  organizationId: string
  buffer: Buffer
  mimeType: string
}

interface UploadLogoResult {
  view: OrganizationView
  previousLogoKey: string | null
  newLogoKey: string
}

@injectable()
export class UploadOrganizationLogo {
  constructor(
    @inject('OrganizationRepository')
    private readonly orgRepo: OrganizationRepository,
    @inject('CacheService') private readonly cache: CacheService,
    @inject('StorageProvider') private readonly storage: StorageProvider
  ) {}

  async execute(input: UploadLogoInput): Promise<UploadLogoResult> {
    assertValidLogoUpload(input.mimeType, input.buffer.length)
    const previousLogoKey = await this.orgRepo.getCurrentLogo(
      input.organizationId
    )
    if (previousLogoKey) {
      await this.deleteOldLogo(previousLogoKey)
    }
    const newLogoKey = logoStorageKey(input.organizationId, input.mimeType)
    await this.storage.upload(newLogoKey, input.buffer, input.mimeType)
    const updated = await this.orgRepo.updateLogo(
      input.organizationId,
      newLogoKey
    )
    await this.cache.delete(`cache:${input.organizationId}:org`)
    const view = await this.toView(updated)
    return { view, previousLogoKey, newLogoKey }
  }

  private async deleteOldLogo(logoKey: string): Promise<void> {
    await this.storage.delete(logoKey).catch((err: unknown) => {
      logger.warn({ err, logoKey }, 'Failed to delete old logo (non-critical)')
    })
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
