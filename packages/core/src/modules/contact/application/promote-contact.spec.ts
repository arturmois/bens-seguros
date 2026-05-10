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
} from '../../client/domain/client-repository.js'

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
    const useCase = new PromoteContact(contactRepo, clientRepo)
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
    const useCase = new PromoteContact(contactRepo, clientRepo)
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
    const useCase = new PromoteContact(contactRepo, clientRepo)
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
    const useCase = new PromoteContact(contactRepo, clientRepo)
    await expect(useCase.execute(baseInput)).rejects.toThrow(
      /já está vinculado|não corresponde/i
    )
  })
  it('lança ContactNotFound quando contato não existe', async () => {
    const { contactRepo, clientRepo } = createMocks({ contact: null })
    const useCase = new PromoteContact(contactRepo, clientRepo)
    await expect(useCase.execute(baseInput)).rejects.toThrow(/não encontrado/i)
  })
})
