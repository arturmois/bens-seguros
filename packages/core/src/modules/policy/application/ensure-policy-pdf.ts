import { inject, injectable } from 'tsyringe'
import type { DocumentRepository } from '../../document/domain/document-repository.js'
import type { StorageProvider } from '../../../platform/storage/storage-provider.js'
import { OrganizationNotFoundError } from '../../workspace/organization/domain/organization-errors.js'
import type { OrganizationRepository } from '../../workspace/organization/domain/organization-repository.js'
import { PolicyErrors } from '../domain/policy-errors.js'
import type { PolicyPdfRenderer } from '../domain/policy-pdf-renderer.js'
import type { PolicyRepository } from '../domain/policy-repository.js'

export interface EnsurePolicyPdfInput {
  readonly policyId: string
  readonly organizationId: string
  readonly userId: string
  readonly force?: boolean
}

export interface EnsurePolicyPdfResult {
  readonly url: string
  readonly cached: boolean
}

@injectable()
export class EnsurePolicyPdf {
  constructor(
    @inject('PolicyRepository') private readonly policyRepo: PolicyRepository,
    @inject('OrganizationRepository')
    private readonly orgRepo: OrganizationRepository,
    @inject('DocumentRepository')
    private readonly documentRepo: DocumentRepository,
    @inject('StorageProvider') private readonly storage: StorageProvider,
    @inject('PolicyPdfRenderer') private readonly renderer: PolicyPdfRenderer
  ) {}

  async execute(input: EnsurePolicyPdfInput): Promise<EnsurePolicyPdfResult> {
    if (!input.force) {
      const cached = await this.findCached(input)
      if (cached) return cached
    }
    return this.renderAndStore(input)
  }

  private async findCached(
    input: EnsurePolicyPdfInput
  ): Promise<EnsurePolicyPdfResult | null> {
    const existing = await this.documentRepo.findByEntity(
      'POLICY',
      input.policyId,
      input.organizationId
    )
    const pdf = existing.find((doc) => doc.type === 'POLICY_PDF')
    if (!pdf) return null
    const url = await this.storage.getSignedUrl(pdf.storageKey)
    return { url, cached: true }
  }

  private async renderAndStore(
    input: EnsurePolicyPdfInput
  ): Promise<EnsurePolicyPdfResult> {
    const policy = await this.policyRepo.findById(
      input.policyId,
      input.organizationId
    )
    if (!policy) throw PolicyErrors.notFound(input.policyId)
    const org = await this.orgRepo.findById(input.organizationId)
    if (!org) throw new OrganizationNotFoundError(input.organizationId)
    const logoUrl = org.logo ? await this.storage.getSignedUrl(org.logo) : null
    const buffer = await this.renderer.render({
      policy,
      organization: { id: org.id, name: org.name, logo: logoUrl },
    })
    const storageKey = `organizations/${input.organizationId}/policies/${input.policyId}/apolice.pdf`
    await this.storage.upload(storageKey, buffer, 'application/pdf')
    await this.documentRepo.upsertByStorageKey({
      organizationId: input.organizationId,
      entityType: 'POLICY',
      entityId: input.policyId,
      type: 'POLICY_PDF',
      fileName: `apolice-${policy.policyNumber}.pdf`,
      mimeType: 'application/pdf',
      sizeBytes: buffer.length,
      storageKey,
      createdBy: input.userId,
    })
    const url = await this.storage.getSignedUrl(storageKey)
    return { url, cached: false }
  }
}
