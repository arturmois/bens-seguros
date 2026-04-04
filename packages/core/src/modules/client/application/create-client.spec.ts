import { describe, expect, it, vi } from 'vitest'
import { ClientAlreadyExistsError } from '../domain/client-errors.js'
import type {
  ClientData,
  ClientRepository,
  CreateClientInput,
} from '../domain/client-repository.js'
import { CreateClient } from './create-client.js'

function makeClientData(overrides: Partial<ClientData> = {}): ClientData {
  return {
    id: 'client-1',
    organizationId: 'org-1',
    name: 'Maria Silva',
    document: '12345678901',
    personType: 'INDIVIDUAL',
    type: 'CLIENT',
    email: 'maria@test.com',
    phone: '11999990000',
    birthDate: null,
    profession: null,
    maritalStatus: null,
    address: null,
    socialMedia: null,
    tags: [],
    consentLgpd: false,
    salespersonId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function createMockRepo(existing: ClientData | null = null): ClientRepository {
  const created = existing ?? makeClientData()
  return {
    create: vi.fn().mockResolvedValue(created),
    findById: vi.fn().mockResolvedValue(null),
    findByDocument: vi.fn().mockResolvedValue(existing),
    findMany: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
  }
}

describe('CreateClient', () => {
  it('creates a new client with valid data', async () => {
    const repo = createMockRepo(null)
    const useCase = new CreateClient(repo)
    const dto: CreateClientInput = {
      organizationId: 'org-1',
      name: 'Maria Silva',
      document: '12345678901',
    }

    const result = await useCase.execute(dto)

    expect(repo.findByDocument).toHaveBeenCalledWith('12345678901', 'org-1')
    expect(repo.create).toHaveBeenCalledWith(dto)
    expect(result.name).toBe('Maria Silva')
  })

  it('throws ClientAlreadyExistsError when document already exists', async () => {
    const existing = makeClientData({ document: '12345678901' })
    const repo = createMockRepo(existing)
    const useCase = new CreateClient(repo)
    const dto: CreateClientInput = {
      organizationId: 'org-1',
      name: 'Maria Silva',
      document: '12345678901',
    }

    await expect(useCase.execute(dto)).rejects.toThrow(ClientAlreadyExistsError)
    expect(repo.create).not.toHaveBeenCalled()
  })
})
