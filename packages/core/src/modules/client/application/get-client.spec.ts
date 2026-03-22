import { describe, expect, it, vi } from 'vitest'
import { ClientNotFoundError } from '../domain/client-errors.js'
import type {
  ClientData,
  ClientRepository,
} from '../domain/client-repository.js'
import { GetClient } from './get-client.js'

function makeClientData(overrides: Partial<ClientData> = {}): ClientData {
  return {
    id: 'client-1',
    organizationId: 'org-1',
    name: 'Maria Silva',
    document: '12345678901',
    type: 'CLIENT',
    email: 'maria@test.com',
    phone: '11999990000',
    birthDate: null,
    profession: null,
    maritalStatus: null,
    address: null,
    tags: [],
    consentLgpd: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function createMockRepo(client: ClientData | null): ClientRepository {
  return {
    create: vi.fn(),
    findById: vi.fn().mockResolvedValue(client),
    findByDocument: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
  }
}

describe('GetClient', () => {
  it('returns client when found', async () => {
    const clientData = makeClientData()
    const repo = createMockRepo(clientData)
    const useCase = new GetClient(repo)

    const result = await useCase.execute('client-1', 'org-1')

    expect(repo.findById).toHaveBeenCalledWith('client-1', 'org-1')
    expect(result.id).toBe('client-1')
    expect(result.name).toBe('Maria Silva')
  })

  it('throws ClientNotFoundError when client does not exist', async () => {
    const repo = createMockRepo(null)
    const useCase = new GetClient(repo)

    await expect(useCase.execute('missing-id', 'org-1')).rejects.toThrow(
      ClientNotFoundError
    )
  })
})
