import 'reflect-metadata'
import { describe, expect, it, vi } from 'vitest'
import { ClientNotFoundError } from '../domain/client-errors.js'
import type {
  ClientRepository,
  ClientWithMetrics,
} from '../domain/client-repository.js'
import { GetClient } from './get-client.js'

function makeClientWithMetrics(
  overrides: Partial<ClientWithMetrics> = {}
): ClientWithMetrics {
  return {
    id: 'client-1',
    organizationId: 'org-1',
    legalName: 'Maria Silva',
    document: '***.789-01',
    documentHash: 'hash-test',
    personType: 'INDIVIDUAL',
    profession: null,
    maritalStatus: null,
    address: null,
    fiscalBirthDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    activePolicyCount: 0,
    totalPolicyCount: 0,
    contactCount: 0,
    ...overrides,
  }
}

function makeRepo(client: ClientWithMetrics | null): ClientRepository {
  return {
    save: vi.fn(),
    findById: vi.fn(),
    findByIdWithMetrics: vi.fn().mockResolvedValue(client),
    findByDocumentHash: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    lgpdAnonymize: vi.fn(),
  }
}

describe('GetClient', () => {
  it('returns client with metrics when found', async () => {
    const clientData = makeClientWithMetrics({ activePolicyCount: 2 })
    const repo = makeRepo(clientData)
    const useCase = new GetClient(repo)

    const result = await useCase.execute({
      id: 'client-1',
      organizationId: 'org-1',
    })

    expect(repo.findByIdWithMetrics).toHaveBeenCalledWith('client-1', 'org-1')
    expect(result.id).toBe('client-1')
    expect(result.legalName).toBe('Maria Silva')
    expect(result.activePolicyCount).toBe(2)
  })

  it('throws ClientNotFoundError when client does not exist', async () => {
    const repo = makeRepo(null)
    const useCase = new GetClient(repo)

    await expect(
      useCase.execute({ id: 'missing-id', organizationId: 'org-1' })
    ).rejects.toThrow(ClientNotFoundError)
  })
})
