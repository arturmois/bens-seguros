import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LgpdDeleteClient } from './lgpd-delete-client.js'
import type {
  ClientData,
  ClientRepository,
} from '../domain/client-repository.js'

function makeClient(overrides: Partial<ClientData> = {}): ClientData {
  return {
    id: 'client-1',
    organizationId: 'org-1',
    legalName: 'João Silva',
    document: '***456.789-00',
    documentHash: 'hash-test',
    personType: 'INDIVIDUAL',
    profession: 'Engenheiro',
    maritalStatus: 'MARRIED',
    address: null,
    fiscalBirthDate: new Date('1990-01-01'),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  }
}

describe('LgpdDeleteClient', () => {
  let useCase: LgpdDeleteClient
  let clientRepo: ClientRepository
  beforeEach(() => {
    clientRepo = {
      save: vi.fn(),
      findById: vi.fn(),
      findByIdWithMetrics: vi.fn(),
      findByDocumentHash: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      lgpdAnonymize: vi.fn(),
    }
    useCase = new LgpdDeleteClient(clientRepo)
  })
  it('anonymizes client when found', async () => {
    vi.mocked(clientRepo.findById).mockResolvedValue(makeClient())
    await useCase.execute('client-1', 'org-1')
    expect(clientRepo.findById).toHaveBeenCalledWith('client-1', 'org-1')
    expect(clientRepo.lgpdAnonymize).toHaveBeenCalledWith('client-1', 'org-1')
  })
  it('throws ClientNotFoundError when client does not exist', async () => {
    vi.mocked(clientRepo.findById).mockResolvedValue(null)
    await expect(useCase.execute('missing', 'org-1')).rejects.toThrow(
      'Cliente missing não encontrado'
    )
    expect(clientRepo.lgpdAnonymize).not.toHaveBeenCalled()
  })
})
