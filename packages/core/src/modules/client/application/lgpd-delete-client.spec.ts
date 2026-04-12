import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LgpdDeleteClient } from './lgpd-delete-client.js'
import type { ClientRepository } from '../domain/client-repository.js'
import type { ClientData } from '../domain/client-repository.js'

function makeClient(overrides: Partial<ClientData> = {}): ClientData {
  return {
    id: 'client-1',
    organizationId: 'org-1',
    name: 'João Silva',
    document: '***456.789-00',
    personType: 'INDIVIDUAL',
    type: 'CLIENT',
    email: 'joao@test.com',
    phone: '+5511999999999',
    birthDate: new Date('1990-01-01'),
    profession: 'Engenheiro',
    maritalStatus: 'MARRIED',
    address: null,
    socialMedia: null,
    tags: ['vip'],
    consentLgpd: true,
    salespersonId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('LgpdDeleteClient', () => {
  let useCase: LgpdDeleteClient
  let clientRepo: ClientRepository

  beforeEach(() => {
    clientRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      findByDocument: vi.fn(),
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
