import { describe, expect, it, vi } from 'vitest'
import type {
  ContactData,
  ContactRepository,
} from '../../contact/domain/contact-repository.js'
import type {
  DocumentData,
  DocumentRepository,
} from '../../document/domain/document-repository.js'
import type {
  ChecklistItemData,
  ChecklistRepository,
} from '../domain/checklist-repository.js'
import type { ProposalRepository } from '../domain/proposal-repository.js'
import { Proposal } from '../domain/proposal.js'
import { AutoCompleteChecklistItems } from './auto-complete-checklist-items.js'

function makeItem(
  overrides: Partial<ChecklistItemData> = {}
): ChecklistItemData {
  return {
    id: 'item-1',
    proposalId: 'prop-1',
    itemKey: 'driver_license',
    label: 'CNH do condutor',
    isRequired: false,
    isCompleted: false,
    completedAt: null,
    completedBy: null,
    createdAt: new Date(),
    ...overrides,
  }
}

function makeContact(overrides: Partial<ContactData> = {}): ContactData {
  return {
    id: 'contact-1',
    organizationId: 'org-1',
    name: 'Maria',
    phone: '11999999999',
    email: null,
    source: 'MANUAL',
    salespersonId: 'u-1',
    clientId: 'client-1',
    tags: [],
    socialMedia: null,
    notes: null,
    consentLgpd: true,
    birthDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  }
}

function makeDocument(overrides: Partial<DocumentData> = {}): DocumentData {
  return {
    id: 'doc-1',
    organizationId: 'org-1',
    entityType: 'PROPOSAL',
    entityId: 'prop-1',
    clientId: null,
    type: 'DRIVER_LICENSE',
    fileName: 'cnh.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 100,
    storageKey: 'org-1/PROPOSAL/prop-1/uuid-cnh.pdf',
    url: null,
    createdBy: 'u-1',
    createdAt: new Date(),
    ...overrides,
  }
}

function createMockChecklistRepo(
  items: ChecklistItemData[] = []
): ChecklistRepository {
  return {
    createMany: vi.fn(),
    findByProposal: vi.fn().mockResolvedValue(items),
    findById: vi.fn(),
    complete: vi
      .fn()
      .mockImplementation((id: string) =>
        Promise.resolve(makeItem({ id, isCompleted: true }))
      ),
    uncomplete: vi.fn(),
    getSummary: vi.fn(),
  }
}

function createMockProposalRepo({
  proposal = null,
  activeProposals = [],
}: {
  proposal?: Proposal | null
  activeProposals?: Proposal[]
} = {}): ProposalRepository {
  return {
    save: vi.fn(),
    findById: vi.fn().mockResolvedValue(proposal),
    listForView: vi.fn(),
    findActiveByContact: vi.fn().mockResolvedValue(activeProposals),
  }
}

function createMockContactRepo(
  contact: ContactData | null = makeContact()
): ContactRepository {
  return {
    save: vi.fn(),
    findById: vi.fn().mockResolvedValue(contact),
    findByIdWithStage: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
  }
}

function createMockDocumentRepo(
  documents: DocumentData[] = []
): DocumentRepository {
  return {
    create: vi.fn(),
    upsertByStorageKey: vi.fn(),
    findById: vi.fn(),
    findByEntity: vi.fn().mockResolvedValue(documents),
    delete: vi.fn(),
  }
}

describe('AutoCompleteChecklistItems', () => {
  describe('by proposalId — driver_license', () => {
    it('marks item with completedBy=null when DRIVER_LICENSE document exists', async () => {
      const proposal = Proposal.create({
        organizationId: 'org-1',
        contactId: 'contact-1',
        salespersonId: 'u-1',
        branch: 'AUTO',
        boardType: 'NEW_INSURANCE',
      })
      const checklistRepo = createMockChecklistRepo([
        makeItem({
          id: 'item-1',
          itemKey: 'driver_license',
          proposalId: proposal.id,
        }),
      ])
      const proposalRepo = createMockProposalRepo({ proposal })
      const contactRepo = createMockContactRepo()
      const documentRepo = createMockDocumentRepo([
        makeDocument({ type: 'DRIVER_LICENSE', entityId: proposal.id }),
      ])
      const useCase = new AutoCompleteChecklistItems(
        checklistRepo,
        proposalRepo,
        contactRepo,
        documentRepo
      )
      await useCase.execute({
        organizationId: 'org-1',
        proposalId: proposal.id,
        itemKey: 'driver_license',
      })
      expect(checklistRepo.complete).toHaveBeenCalledWith(
        'item-1',
        proposal.id,
        null
      )
    })

    it('does NOT mark item when no DRIVER_LICENSE document exists', async () => {
      const proposal = Proposal.create({
        organizationId: 'org-1',
        contactId: 'contact-1',
        salespersonId: 'u-1',
        branch: 'AUTO',
        boardType: 'NEW_INSURANCE',
      })
      const checklistRepo = createMockChecklistRepo([
        makeItem({
          id: 'item-1',
          itemKey: 'driver_license',
          proposalId: proposal.id,
        }),
      ])
      const proposalRepo = createMockProposalRepo({ proposal })
      const contactRepo = createMockContactRepo()
      const documentRepo = createMockDocumentRepo([])
      const useCase = new AutoCompleteChecklistItems(
        checklistRepo,
        proposalRepo,
        contactRepo,
        documentRepo
      )
      await useCase.execute({
        organizationId: 'org-1',
        proposalId: proposal.id,
        itemKey: 'driver_license',
      })
      expect(checklistRepo.complete).not.toHaveBeenCalled()
    })
  })

  describe('by proposalId — vehicle_registration', () => {
    it('marks when VEHICLE_REGISTRATION document exists', async () => {
      const proposal = Proposal.create({
        organizationId: 'org-1',
        contactId: 'contact-1',
        salespersonId: 'u-1',
        branch: 'AUTO',
        boardType: 'NEW_INSURANCE',
      })
      const checklistRepo = createMockChecklistRepo([
        makeItem({
          id: 'item-1',
          itemKey: 'vehicle_registration',
          proposalId: proposal.id,
        }),
      ])
      const proposalRepo = createMockProposalRepo({ proposal })
      const contactRepo = createMockContactRepo()
      const documentRepo = createMockDocumentRepo([
        makeDocument({ type: 'VEHICLE_REGISTRATION', entityId: proposal.id }),
      ])
      const useCase = new AutoCompleteChecklistItems(
        checklistRepo,
        proposalRepo,
        contactRepo,
        documentRepo
      )
      await useCase.execute({
        organizationId: 'org-1',
        proposalId: proposal.id,
        itemKey: 'vehicle_registration',
      })
      expect(checklistRepo.complete).toHaveBeenCalledTimes(1)
    })

    it('does NOT mark when only an unrelated document type is present', async () => {
      const proposal = Proposal.create({
        organizationId: 'org-1',
        contactId: 'contact-1',
        salespersonId: 'u-1',
        branch: 'AUTO',
        boardType: 'NEW_INSURANCE',
      })
      const checklistRepo = createMockChecklistRepo([
        makeItem({
          id: 'item-1',
          itemKey: 'vehicle_registration',
          proposalId: proposal.id,
        }),
      ])
      const proposalRepo = createMockProposalRepo({ proposal })
      const contactRepo = createMockContactRepo()
      const documentRepo = createMockDocumentRepo([
        makeDocument({ type: 'DRIVER_LICENSE', entityId: proposal.id }),
      ])
      const useCase = new AutoCompleteChecklistItems(
        checklistRepo,
        proposalRepo,
        contactRepo,
        documentRepo
      )
      await useCase.execute({
        organizationId: 'org-1',
        proposalId: proposal.id,
        itemKey: 'vehicle_registration',
      })
      expect(checklistRepo.complete).not.toHaveBeenCalled()
    })
  })

  describe('by proposalId — client_data', () => {
    it('marks when contact has clientId (promoted)', async () => {
      const proposal = Proposal.create({
        organizationId: 'org-1',
        contactId: 'contact-1',
        salespersonId: 'u-1',
        branch: 'AUTO',
        boardType: 'NEW_INSURANCE',
      })
      const checklistRepo = createMockChecklistRepo([
        makeItem({
          id: 'item-1',
          itemKey: 'client_data',
          proposalId: proposal.id,
        }),
      ])
      const proposalRepo = createMockProposalRepo({ proposal })
      const contactRepo = createMockContactRepo(
        makeContact({ id: 'contact-1', clientId: 'client-1' })
      )
      const documentRepo = createMockDocumentRepo([])
      const useCase = new AutoCompleteChecklistItems(
        checklistRepo,
        proposalRepo,
        contactRepo,
        documentRepo
      )
      await useCase.execute({
        organizationId: 'org-1',
        proposalId: proposal.id,
        itemKey: 'client_data',
      })
      expect(checklistRepo.complete).toHaveBeenCalledTimes(1)
    })

    it('does NOT mark when contact has no clientId', async () => {
      const proposal = Proposal.create({
        organizationId: 'org-1',
        contactId: 'contact-1',
        salespersonId: 'u-1',
        branch: 'AUTO',
        boardType: 'NEW_INSURANCE',
      })
      const checklistRepo = createMockChecklistRepo([
        makeItem({
          id: 'item-1',
          itemKey: 'client_data',
          proposalId: proposal.id,
        }),
      ])
      const proposalRepo = createMockProposalRepo({ proposal })
      const contactRepo = createMockContactRepo(
        makeContact({ id: 'contact-1', clientId: null })
      )
      const documentRepo = createMockDocumentRepo([])
      const useCase = new AutoCompleteChecklistItems(
        checklistRepo,
        proposalRepo,
        contactRepo,
        documentRepo
      )
      await useCase.execute({
        organizationId: 'org-1',
        proposalId: proposal.id,
        itemKey: 'client_data',
      })
      expect(checklistRepo.complete).not.toHaveBeenCalled()
    })

    it('does NOT mark when proposal is not found', async () => {
      const checklistRepo = createMockChecklistRepo([
        makeItem({
          id: 'item-1',
          itemKey: 'client_data',
          proposalId: 'prop-1',
        }),
      ])
      const proposalRepo = createMockProposalRepo({ proposal: null })
      const contactRepo = createMockContactRepo()
      const documentRepo = createMockDocumentRepo([])
      const useCase = new AutoCompleteChecklistItems(
        checklistRepo,
        proposalRepo,
        contactRepo,
        documentRepo
      )
      await useCase.execute({
        organizationId: 'org-1',
        proposalId: 'prop-1',
        itemKey: 'client_data',
      })
      expect(checklistRepo.complete).not.toHaveBeenCalled()
    })
  })

  describe('common behavior', () => {
    it('no-op when item is already completed', async () => {
      const proposal = Proposal.create({
        organizationId: 'org-1',
        contactId: 'contact-1',
        salespersonId: 'u-1',
        branch: 'AUTO',
        boardType: 'NEW_INSURANCE',
      })
      const checklistRepo = createMockChecklistRepo([
        makeItem({
          id: 'item-1',
          itemKey: 'driver_license',
          isCompleted: true,
          proposalId: proposal.id,
        }),
      ])
      const proposalRepo = createMockProposalRepo({ proposal })
      const contactRepo = createMockContactRepo()
      const documentRepo = createMockDocumentRepo([
        makeDocument({ type: 'DRIVER_LICENSE', entityId: proposal.id }),
      ])
      const useCase = new AutoCompleteChecklistItems(
        checklistRepo,
        proposalRepo,
        contactRepo,
        documentRepo
      )
      await useCase.execute({
        organizationId: 'org-1',
        proposalId: proposal.id,
        itemKey: 'driver_license',
      })
      expect(checklistRepo.complete).not.toHaveBeenCalled()
    })

    it('no-op when item does not exist', async () => {
      const proposal = Proposal.create({
        organizationId: 'org-1',
        contactId: 'contact-1',
        salespersonId: 'u-1',
        branch: 'AUTO',
        boardType: 'NEW_INSURANCE',
      })
      const checklistRepo = createMockChecklistRepo([])
      const proposalRepo = createMockProposalRepo({ proposal })
      const contactRepo = createMockContactRepo()
      const documentRepo = createMockDocumentRepo([])
      const useCase = new AutoCompleteChecklistItems(
        checklistRepo,
        proposalRepo,
        contactRepo,
        documentRepo
      )
      await useCase.execute({
        organizationId: 'org-1',
        proposalId: proposal.id,
        itemKey: 'driver_license',
      })
      expect(checklistRepo.complete).not.toHaveBeenCalled()
    })
  })

  describe('by contactId', () => {
    it('iterates active proposals and marks client_data when contact is promoted', async () => {
      const p1 = Proposal.create({
        organizationId: 'org-1',
        contactId: 'contact-1',
        salespersonId: 'u-1',
        branch: 'AUTO',
        boardType: 'NEW_INSURANCE',
      })
      const p2 = Proposal.create({
        organizationId: 'org-1',
        contactId: 'contact-1',
        salespersonId: 'u-1',
        branch: 'AUTO',
        boardType: 'NEW_INSURANCE',
      })
      const checklistRepo = createMockChecklistRepo([
        makeItem({ id: 'item-p1', proposalId: p1.id, itemKey: 'client_data' }),
        makeItem({ id: 'item-p2', proposalId: p2.id, itemKey: 'client_data' }),
      ])
      const proposalRepo = createMockProposalRepo({
        activeProposals: [p1, p2],
      })
      vi.mocked(proposalRepo.findById).mockImplementation(
        async (id: string) => {
          if (id === p1.id) return p1
          if (id === p2.id) return p2
          return null
        }
      )
      const contactRepo = createMockContactRepo(
        makeContact({ id: 'contact-1', clientId: 'client-1' })
      )
      const documentRepo = createMockDocumentRepo()
      const useCase = new AutoCompleteChecklistItems(
        checklistRepo,
        proposalRepo,
        contactRepo,
        documentRepo
      )
      await useCase.execute({
        organizationId: 'org-1',
        contactId: 'contact-1',
        itemKey: 'client_data',
      })
      expect(proposalRepo.findActiveByContact).toHaveBeenCalledWith(
        'contact-1',
        'org-1'
      )
      expect(checklistRepo.complete).toHaveBeenCalledTimes(2)
    })

    it('no-op when contact has no active proposals', async () => {
      const checklistRepo = createMockChecklistRepo()
      const proposalRepo = createMockProposalRepo({ activeProposals: [] })
      const contactRepo = createMockContactRepo()
      const documentRepo = createMockDocumentRepo()
      const useCase = new AutoCompleteChecklistItems(
        checklistRepo,
        proposalRepo,
        contactRepo,
        documentRepo
      )
      await useCase.execute({
        organizationId: 'org-1',
        contactId: 'contact-1',
        itemKey: 'client_data',
      })
      expect(checklistRepo.complete).not.toHaveBeenCalled()
    })
  })
})
