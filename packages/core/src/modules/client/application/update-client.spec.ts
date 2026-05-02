import 'reflect-metadata'
import { describe, expect, it, vi } from 'vitest'
import type {
  ClientData,
  ClientRepository,
} from '../domain/client-repository.js'
import { UpdateClient } from './update-client.js'

const existing: ClientData = {
  id: 'c-1',
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
}

function makeRepo(overrides: Partial<ClientRepository> = {}): ClientRepository {
  return {
    save: vi.fn(),
    findById: vi.fn(async () => existing),
    findByIdWithMetrics: vi.fn(),
    findByDocumentHash: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(async (_id, _org, data) => ({ ...existing, ...data })),
    softDelete: vi.fn(),
    lgpdAnonymize: vi.fn(),
    ...overrides,
  }
}

describe('UpdateClient', () => {
  it('updates fiscal fields', async () => {
    const repo = makeRepo()
    const useCase = new UpdateClient(repo)

    const result = await useCase.execute({
      id: 'c-1',
      organizationId: 'org-1',
      profession: 'Engenheira',
    })

    expect(repo.findById).toHaveBeenCalledWith('c-1', 'org-1')
    expect(repo.update).toHaveBeenCalledWith(
      'c-1',
      'org-1',
      expect.objectContaining({ profession: 'Engenheira' })
    )
    expect(result.profession).toBe('Engenheira')
  })

  it('throws ClientNotFoundError when client does not exist', async () => {
    const repo = makeRepo({ findById: vi.fn(async () => null) })
    const useCase = new UpdateClient(repo)

    await expect(
      useCase.execute({ id: 'missing', organizationId: 'org-1' })
    ).rejects.toThrow(/não encontrado/i)
    expect(repo.update).not.toHaveBeenCalled()
  })
})
