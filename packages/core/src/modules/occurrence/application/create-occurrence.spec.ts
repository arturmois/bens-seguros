import { describe, expect, it, vi } from 'vitest'
import type {
  OccurrenceData,
  OccurrenceRepository,
  CreateOccurrenceInput,
} from '../domain/occurrence-repository.js'
import type {
  ClaimData,
  ClaimRepository,
} from '../../claim/domain/claim-repository.js'
import { OccurrenceClaimNotFoundError } from '../domain/occurrence-errors.js'
import { CreateOccurrence } from './create-occurrence.js'

function makeOccurrenceData(
  overrides: Partial<OccurrenceData> = {}
): OccurrenceData {
  return {
    id: 'occ-1',
    claimId: 'claim-1',
    organizationId: 'org-1',
    type: 'STATUS_CHANGE',
    description: 'Status alterado para Em Análise',
    metadata: null,
    createdBy: 'user-1',
    createdAt: new Date(),
    ...overrides,
  }
}

function makeClaimData(overrides: Partial<ClaimData> = {}): ClaimData {
  return {
    id: 'claim-1',
    organizationId: 'org-1',
    claimNumber: 1,
    policyId: 'pol-1',
    clientId: 'c-1',
    insurerId: null,
    assignedToId: null,
    status: 'REGISTERED',
    priority: 'NORMAL',
    description: 'Vehicle collision',
    estimatedValueInCents: null,
    incidentDate: null,
    incidentLocation: null,
    reportedAt: new Date(),
    resolvedAt: null,
    closedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makeOccurrenceRepo(result: OccurrenceData): OccurrenceRepository {
  return {
    create: vi.fn().mockResolvedValue(result),
    findByClaimId: vi.fn(),
  }
}

function makeClaimRepo(claim: ClaimData | null): ClaimRepository {
  return {
    create: vi.fn(),
    findById: vi.fn().mockResolvedValue(claim),
    findMany: vi.fn(),
    updateStatus: vi.fn(),
    softDelete: vi.fn(),
  }
}

describe('CreateOccurrence', () => {
  it('creates occurrence when claim belongs to tenant', async () => {
    const occurrenceData = makeOccurrenceData()
    const occurrenceRepo = makeOccurrenceRepo(occurrenceData)
    const claimRepo = makeClaimRepo(makeClaimData())
    const useCase = new CreateOccurrence(occurrenceRepo, claimRepo)
    const dto: CreateOccurrenceInput = {
      claimId: 'claim-1',
      organizationId: 'org-1',
      type: 'STATUS_CHANGE',
      description: 'Status alterado para Em Análise',
    }
    const result = await useCase.execute(dto)
    expect(claimRepo.findById).toHaveBeenCalledWith('claim-1', 'org-1')
    expect(occurrenceRepo.create).toHaveBeenCalledWith(dto)
    expect(result.organizationId).toBe('org-1')
    expect(result.claimId).toBe('claim-1')
  })
  it('rejects occurrence when claim does not belong to tenant', async () => {
    const occurrenceRepo = makeOccurrenceRepo(makeOccurrenceData())
    const claimRepo = makeClaimRepo(null)
    const useCase = new CreateOccurrence(occurrenceRepo, claimRepo)
    const dto: CreateOccurrenceInput = {
      claimId: 'claim-other-tenant',
      organizationId: 'org-1',
      type: 'NOTE',
      description: 'Tentativa de acesso cruzado',
    }
    await expect(useCase.execute(dto)).rejects.toThrow(
      OccurrenceClaimNotFoundError
    )
    expect(claimRepo.findById).toHaveBeenCalledWith(
      'claim-other-tenant',
      'org-1'
    )
    expect(occurrenceRepo.create).not.toHaveBeenCalled()
  })
  it('passes createdBy to repository', async () => {
    const occurrenceData = makeOccurrenceData({ createdBy: 'user-42' })
    const occurrenceRepo = makeOccurrenceRepo(occurrenceData)
    const claimRepo = makeClaimRepo(makeClaimData())
    const useCase = new CreateOccurrence(occurrenceRepo, claimRepo)
    const dto: CreateOccurrenceInput = {
      claimId: 'claim-1',
      organizationId: 'org-1',
      type: 'DOCUMENT_ADDED',
      description: 'Documento enviado pelo segurado',
      createdBy: 'user-42',
    }
    const result = await useCase.execute(dto)
    expect(occurrenceRepo.create).toHaveBeenCalledWith(dto)
    expect(result.createdBy).toBe('user-42')
  })
  it('passes metadata to repository', async () => {
    const meta = { previousStatus: 'REGISTERED', newStatus: 'IN_ANALYSIS' }
    const occurrenceData = makeOccurrenceData({ metadata: meta })
    const occurrenceRepo = makeOccurrenceRepo(occurrenceData)
    const claimRepo = makeClaimRepo(makeClaimData())
    const useCase = new CreateOccurrence(occurrenceRepo, claimRepo)
    const dto: CreateOccurrenceInput = {
      claimId: 'claim-1',
      organizationId: 'org-1',
      type: 'STATUS_CHANGE',
      description: 'Transição de status',
      metadata: meta,
    }
    const result = await useCase.execute(dto)
    expect(result.metadata).toEqual(meta)
  })
})
