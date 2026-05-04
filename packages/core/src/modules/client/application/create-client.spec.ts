import { describe, it, expect, vi, beforeEach } from 'vitest'
import { hashDocument } from '@repo/shared'
import { CreateClient } from './create-client.js'
import { ClientAlreadyExistsError } from '../domain/client-errors.js'
import type {
  ClientRepository,
  ClientData,
} from '../domain/client-repository.js'

function makeRepo(): ClientRepository {
  return {
    save: vi.fn(),
    findById: vi.fn(),
    findByIdWithMetrics: vi.fn(),
    findByDocumentHash: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    lgpdAnonymize: vi.fn(),
  }
}

const ORG = 'org-1'
const SAVED: ClientData = {
  id: 'client-1',
  organizationId: ORG,
  legalName: 'Acme Ltda',
  document: '12345678000190',
  documentHash: hashDocument('12345678000190'),
  personType: 'COMPANY',
  profession: null,
  maritalStatus: null,
  address: null,
  fiscalBirthDate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
}

describe('CreateClient', () => {
  let repo: ClientRepository
  let useCase: CreateClient

  beforeEach(() => {
    repo = makeRepo()
    useCase = new CreateClient(repo)
  })

  it('rejeita criação se documento já existe na organização', async () => {
    vi.mocked(repo.findByDocumentHash).mockResolvedValue(SAVED)

    await expect(
      useCase.execute({
        organizationId: ORG,
        legalName: 'Acme Ltda',
        document: '12345678000190',
        personType: 'COMPANY',
      })
    ).rejects.toBeInstanceOf(ClientAlreadyExistsError)

    expect(repo.save).not.toHaveBeenCalled()
  })

  it('cria cliente com defaults quando campos opcionais ausentes', async () => {
    vi.mocked(repo.findByDocumentHash).mockResolvedValue(null)
    vi.mocked(repo.save).mockResolvedValue(SAVED)

    const result = await useCase.execute({
      organizationId: ORG,
      legalName: 'João Silva',
      document: '12345678901',
    })

    expect(repo.save).toHaveBeenCalledWith({
      organizationId: ORG,
      legalName: 'João Silva',
      document: '12345678901',
      personType: 'INDIVIDUAL',
      profession: null,
      maritalStatus: null,
      address: null,
      fiscalBirthDate: null,
    })
    expect(result).toBe(SAVED)
  })

  it('persiste todos os campos fiscais quando fornecidos', async () => {
    vi.mocked(repo.findByDocumentHash).mockResolvedValue(null)
    vi.mocked(repo.save).mockResolvedValue(SAVED)

    const birthDate = new Date('1990-05-10')
    await useCase.execute({
      organizationId: ORG,
      legalName: 'João Silva',
      document: '12345678901',
      personType: 'INDIVIDUAL',
      profession: 'Engenheiro',
      maritalStatus: 'MARRIED',
      address: { city: 'São Paulo' },
      fiscalBirthDate: birthDate,
    })

    expect(repo.save).toHaveBeenCalledWith({
      organizationId: ORG,
      legalName: 'João Silva',
      document: '12345678901',
      personType: 'INDIVIDUAL',
      profession: 'Engenheiro',
      maritalStatus: 'MARRIED',
      address: { city: 'São Paulo' },
      fiscalBirthDate: birthDate,
    })
  })

  it('escopa busca de duplicata por organizationId', async () => {
    vi.mocked(repo.findByDocumentHash).mockResolvedValue(null)
    vi.mocked(repo.save).mockResolvedValue(SAVED)

    await useCase.execute({
      organizationId: 'org-A',
      legalName: 'X',
      document: '12345678901',
    })

    expect(repo.findByDocumentHash).toHaveBeenCalledWith(
      hashDocument('12345678901'),
      'org-A'
    )
  })
})
