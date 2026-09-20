import { inject, injectable } from 'tsyringe'
import type { ContactRepository } from '../../contact/domain/contact-repository.js'
import type {
  DocumentRepository,
  DocumentType,
} from '../../document/domain/document-repository.js'
import type { ChecklistRepository } from '../domain/checklist-repository.js'
import type { ProposalRepository } from '../domain/proposal-repository.js'

export type AutoCompleteItemKey =
  | 'client_data'
  | 'driver_license'
  | 'vehicle_registration'

interface AutoCompleteByProposalInput {
  readonly organizationId: string
  readonly proposalId: string
  readonly itemKey: AutoCompleteItemKey
}

interface AutoCompleteByContactInput {
  readonly organizationId: string
  readonly contactId: string
  readonly itemKey: 'client_data'
}

export type AutoCompleteChecklistInput =
  | AutoCompleteByProposalInput
  | AutoCompleteByContactInput

const ITEM_KEY_TO_DOCUMENT_TYPE: Record<
  'driver_license' | 'vehicle_registration',
  DocumentType
> = {
  driver_license: 'DRIVER_LICENSE',
  vehicle_registration: 'VEHICLE_REGISTRATION',
}

@injectable()
export class AutoCompleteChecklistItems {
  constructor(
    @inject('ChecklistRepository')
    private readonly checklistRepo: ChecklistRepository,
    @inject('ProposalRepository')
    private readonly proposalRepo: ProposalRepository,
    @inject('ContactRepository')
    private readonly contactRepo: ContactRepository,
    @inject('DocumentRepository')
    private readonly documentRepo: DocumentRepository
  ) {}

  async execute(input: AutoCompleteChecklistInput): Promise<void> {
    if ('proposalId' in input) {
      await this.completeByProposal(
        input.organizationId,
        input.proposalId,
        input.itemKey
      )
      return
    }
    const proposals = await this.proposalRepo.findActiveByContact(
      input.contactId,
      input.organizationId
    )
    for (const proposal of proposals) {
      await this.completeByProposal(
        input.organizationId,
        proposal.id,
        input.itemKey
      )
    }
  }

  private async completeByProposal(
    organizationId: string,
    proposalId: string,
    itemKey: AutoCompleteItemKey
  ): Promise<void> {
    const items = await this.checklistRepo.findByProposal(proposalId)
    const target = items.find((item) => item.itemKey === itemKey)
    if (!target || target.isCompleted) return
    const conditionMet = await this.isConditionMet(
      organizationId,
      proposalId,
      itemKey
    )
    if (!conditionMet) return
    await this.checklistRepo.complete(target.id, proposalId, null)
  }

  private async isConditionMet(
    organizationId: string,
    proposalId: string,
    itemKey: AutoCompleteItemKey
  ): Promise<boolean> {
    if (itemKey === 'client_data') {
      return this.isClientDataMet(organizationId, proposalId)
    }
    const documentType = ITEM_KEY_TO_DOCUMENT_TYPE[itemKey]
    return this.hasDocumentOfType(organizationId, proposalId, documentType)
  }

  private async isClientDataMet(
    organizationId: string,
    proposalId: string
  ): Promise<boolean> {
    const proposal = await this.proposalRepo.findById(
      proposalId,
      organizationId
    )
    if (!proposal) return false
    const contact = await this.contactRepo.findById(
      proposal.contactId,
      organizationId
    )
    return Boolean(contact?.clientId)
  }

  private async hasDocumentOfType(
    organizationId: string,
    proposalId: string,
    type: DocumentType
  ): Promise<boolean> {
    const documents = await this.documentRepo.findByEntity(
      'PROPOSAL',
      proposalId,
      organizationId
    )
    return documents.some((doc) => doc.type === type)
  }
}
