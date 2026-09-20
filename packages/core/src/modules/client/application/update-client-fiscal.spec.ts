import { describe, expect, it, vi } from 'vitest'
import type {
  ClientData,
  ClientRepository,
} from '../domain/client-repository.js'
import { UpdateClientFiscal } from './update-client-fiscal.js'

function client(): ClientData {
  return {
    id: 'client-1',
    organizationId: 'org-1',
    legalName: 'João Silva',
    document: '11144477735',
    documentHash: 'hash',
    personType: 'INDIVIDUAL',
    profession: null,
    maritalStatus: null,
    address: null,
    fiscalBirthDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  }
}

describe('UpdateClientFiscal', () => {
  it('email-only input does not write email on client', async () => {
    const repo: ClientRepository = {
      save: vi.fn(),
      findById: vi.fn().mockResolvedValue(client()),
      findByIdWithMetrics: vi.fn(),
      findByDocumentHash: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn().mockResolvedValue(client()),
      softDelete: vi.fn(),
      lgpdAnonymize: vi.fn(),
    }
    const useCase = new UpdateClientFiscal(repo)
    await useCase.execute({
      id: 'client-1',
      organizationId: 'org-1',
      email: 'novo@example.com',
    })
    if (vi.mocked(repo.update).mock.calls.length === 0) {
      expect(repo.update).not.toHaveBeenCalled()
      return
    }
    const payload = vi.mocked(repo.update).mock.calls[0]?.[2]
    expect(payload).toBeDefined()
    expect(payload).not.toHaveProperty('email')
  })
})
