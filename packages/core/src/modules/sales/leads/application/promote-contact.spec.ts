import { describe, it, expect, vi } from 'vitest'
import 'reflect-metadata'
import { hashDocument } from '@repo/shared'
import { PromoteContact } from './promote-contact.js'
import type {
  ContactRepository,
  ContactData,
} from '../domain/contact-repository.js'
import type {
  ClientRepository,
  ClientData,
} from '../../../client/domain/client-repository.js'
import { AutoCompleteChecklistItems } from '../../proposals/application/auto-complete-checklist-items.js'

function createMockAutoComplete(): AutoCompleteChecklistItems {
  return {
    execute: vi.fn().mockResolvedValue(undefined),
  } as unknown as AutoCompleteChecklistItems
}

function makeContact(overrides: Partial<ContactData> = {}): ContactData {
  return {
    id: 'contact-1',
    organizationId: 'org-1',
    name: 'Maria',
    phone: '+5511999999999',
    email: null,
    source: 'MANUAL',
    salespersonId: 'user-1',
    clientId: null,
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

type ClientWithHash = Partial<ClientData> & { documentHash?: string }

function makeClient(overrides: ClientWithHash = {}): ClientData {
  return {
    id: 'client-1',
    organizationId: 'org-1',
    legalName: 'Maria Silva',
    document: '***.***.789-01',
    personType: 'INDIVIDUAL',
    profession: null,
    maritalStatus: null,
    address: null,
    fiscalBirthDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  } as ClientData
}

function createMocks(
  opts: {
    contact?: ContactData | null
    existingClient?: ClientData | null
  } = {}
) {
  const contactRepo: ContactRepository = {
    save: vi.fn(),
    findById: vi.fn(async () => opts.contact ?? null),
    findByIdWithStage: vi.fn(),
    findByPhone: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(async (id, _org, data) => ({
      ...(opts.contact as ContactData),
      ...data,
      id,
    })),
    softDelete: vi.fn(),
  }
  const clientRepo: ClientRepository = {
    findByDocumentHash: vi.fn(async () => opts.existingClient ?? null),
    findById: vi.fn(async () => opts.existingClient ?? null),
    findMany: vi.fn(),
    save: vi.fn(
      async (data) =>
        ({
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        }) as ClientData
    ),
    update: vi.fn(),
    softDelete: vi.fn(),
  } as unknown as ClientRepository
  return { contactRepo, clientRepo }
}

describe('PromoteContact', () => {
  const baseInput = {
    contactId: 'contact-1',
    organizationId: 'org-1',
    document: '52998224725',
    legalName: 'Maria Silva',
  }
  it('cria novo Client quando documentHash não existe', async () => {
    const { contactRepo, clientRepo } = createMocks({ contact: makeContact() })
    const autoComplete = createMockAutoComplete()
    const useCase = new PromoteContact(contactRepo, clientRepo, autoComplete)
    const client = await useCase.execute(baseInput)
    expect(clientRepo.save).toHaveBeenCalledTimes(1)
    expect(contactRepo.update).toHaveBeenCalledWith(
      'contact-1',
      'org-1',
      expect.objectContaining({ clientId: client.id })
    )
  })
  it('vincula a Client existente quando documentHash já existe na org', async () => {
    const existing = makeClient({ id: 'client-existing' })
    const { contactRepo, clientRepo } = createMocks({
      contact: makeContact(),
      existingClient: existing,
    })
    const autoComplete = createMockAutoComplete()
    const useCase = new PromoteContact(contactRepo, clientRepo, autoComplete)
    const client = await useCase.execute(baseInput)
    expect(client.id).toBe('client-existing')
    expect(clientRepo.save).not.toHaveBeenCalled()
    expect(contactRepo.update).toHaveBeenCalledWith(
      'contact-1',
      'org-1',
      expect.objectContaining({ clientId: 'client-existing' })
    )
  })
  it('é idempotente — chamar 2x com mesmo doc retorna mesmo Client', async () => {
    const existing = makeClient({
      id: 'client-X',
      documentHash: hashDocument(baseInput.document),
    })
    const promoted = makeContact({ clientId: 'client-X' })
    const { contactRepo, clientRepo } = createMocks({
      contact: promoted,
      existingClient: existing,
    })
    const autoComplete = createMockAutoComplete()
    const useCase = new PromoteContact(contactRepo, clientRepo, autoComplete)
    const client = await useCase.execute(baseInput)
    expect(client.id).toBe('client-X')
    expect(clientRepo.save).not.toHaveBeenCalled()
    expect(contactRepo.update).not.toHaveBeenCalled()
  })
  it('lança DocumentMismatchError quando contato já vinculado a Client com hash diferente', async () => {
    const otherClient = makeClient({
      id: 'client-Y',
      document: '***.***.000-00',
    })
    const promoted = makeContact({ clientId: 'client-Y' })
    const contactRepo: ContactRepository = {
      save: vi.fn(),
      findById: vi.fn(async () => promoted),
      findByIdWithStage: vi.fn(),
      findByPhone: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
    }
    const clientRepo = {
      findByDocumentHash: vi.fn(async () => null), // doc novo
      findById: vi.fn(async () => otherClient), // doc atual diferente
      findMany: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
    } as unknown as ClientRepository
    const autoComplete = createMockAutoComplete()
    const useCase = new PromoteContact(contactRepo, clientRepo, autoComplete)
    await expect(useCase.execute(baseInput)).rejects.toThrow(
      /já está vinculado|não corresponde/i
    )
  })
  it('lança ContactNotFound quando contato não existe', async () => {
    const { contactRepo, clientRepo } = createMocks({ contact: null })
    const autoComplete = createMockAutoComplete()
    const useCase = new PromoteContact(contactRepo, clientRepo, autoComplete)
    await expect(useCase.execute(baseInput)).rejects.toThrow(/não encontrado/i)
  })
  it('calls AutoCompleteChecklistItems for client_data after creating new client', async () => {
    const { contactRepo, clientRepo } = createMocks({ contact: makeContact() })
    const autoComplete = createMockAutoComplete()
    const useCase = new PromoteContact(contactRepo, clientRepo, autoComplete)
    await useCase.execute(baseInput)
    expect(autoComplete.execute).toHaveBeenCalledTimes(1)
    expect(autoComplete.execute).toHaveBeenCalledWith({
      organizationId: 'org-1',
      contactId: 'contact-1',
      itemKey: 'client_data',
    })
  })
  it('calls AutoCompleteChecklistItems when contact links to existing client', async () => {
    const existing = makeClient({ id: 'client-existing' })
    const { contactRepo, clientRepo } = createMocks({
      contact: makeContact(),
      existingClient: existing,
    })
    const autoComplete = createMockAutoComplete()
    const useCase = new PromoteContact(contactRepo, clientRepo, autoComplete)
    await useCase.execute(baseInput)
    expect(autoComplete.execute).toHaveBeenCalledTimes(1)
    expect(autoComplete.execute).toHaveBeenCalledWith({
      organizationId: 'org-1',
      contactId: 'contact-1',
      itemKey: 'client_data',
    })
  })
})
