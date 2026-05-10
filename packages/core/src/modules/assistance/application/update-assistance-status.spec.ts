import { describe, expect, it, vi } from 'vitest'
import type {
  AssistanceData,
  AssistanceRepository,
} from '../domain/assistance-repository.js'
import {
  AssistanceNotFoundError,
  InvalidAssistanceStatusTransitionError,
} from '../domain/assistance-errors.js'
import { UpdateAssistanceStatus } from './update-assistance-status.js'

function makeAssistanceData(
  overrides: Partial<AssistanceData> = {}
): AssistanceData {
  return {
    id: 'assist-1',
    organizationId: 'org-1',
    policyId: 'pol-1',
    clientId: 'c-1',
    claimId: null,
    type: 'TOWING',
    status: 'REQUESTED',
    description: 'Vehicle breakdown',
    address: 'Rua X, 123',
    latitude: null,
    longitude: null,
    providerName: null,
    providerPhone: null,
    requestedAt: new Date(),
    scheduledAt: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function createMockRepo(data: AssistanceData | null): AssistanceRepository {
  return {
    create: vi.fn(),
    findById: vi.fn().mockResolvedValue(data),
    findMany: vi.fn(),
    updateStatus: vi.fn().mockImplementation(async (_id, _orgId, input) => ({
      ...makeAssistanceData(),
      ...input,
    })),
  }
}

describe('UpdateAssistanceStatus', () => {
  it('transitions REQUESTED to AWAITING_DOCUMENT', async () => {
    const repo = createMockRepo(makeAssistanceData({ status: 'REQUESTED' }))
    const useCase = new UpdateAssistanceStatus(repo)
    await useCase.execute('assist-1', 'org-1', 'AWAITING_DOCUMENT')
    expect(repo.updateStatus).toHaveBeenCalledWith('assist-1', 'org-1', {
      status: 'AWAITING_DOCUMENT',
      completedAt: undefined,
    })
  })
  it('transitions REQUESTED to DISPATCHED', async () => {
    const repo = createMockRepo(makeAssistanceData({ status: 'REQUESTED' }))
    const useCase = new UpdateAssistanceStatus(repo)
    await useCase.execute('assist-1', 'org-1', 'DISPATCHED')
    expect(repo.updateStatus).toHaveBeenCalledWith('assist-1', 'org-1', {
      status: 'DISPATCHED',
      completedAt: undefined,
    })
  })
  it('transitions AWAITING_DOCUMENT to PENDING_INSPECTION', async () => {
    const repo = createMockRepo(
      makeAssistanceData({ status: 'AWAITING_DOCUMENT' })
    )
    const useCase = new UpdateAssistanceStatus(repo)
    await useCase.execute('assist-1', 'org-1', 'PENDING_INSPECTION')
    expect(repo.updateStatus).toHaveBeenCalledWith('assist-1', 'org-1', {
      status: 'PENDING_INSPECTION',
      completedAt: undefined,
    })
  })
  it('transitions PENDING_INSPECTION to DISPATCHED', async () => {
    const repo = createMockRepo(
      makeAssistanceData({ status: 'PENDING_INSPECTION' })
    )
    const useCase = new UpdateAssistanceStatus(repo)
    await useCase.execute('assist-1', 'org-1', 'DISPATCHED')
    expect(repo.updateStatus).toHaveBeenCalledWith('assist-1', 'org-1', {
      status: 'DISPATCHED',
      completedAt: undefined,
    })
  })
  it('transitions DISPATCHED to IN_PROGRESS', async () => {
    const repo = createMockRepo(makeAssistanceData({ status: 'DISPATCHED' }))
    const useCase = new UpdateAssistanceStatus(repo)
    await useCase.execute('assist-1', 'org-1', 'IN_PROGRESS')
    expect(repo.updateStatus).toHaveBeenCalledWith('assist-1', 'org-1', {
      status: 'IN_PROGRESS',
      completedAt: undefined,
    })
  })
  it('transitions IN_PROGRESS to COMPLETED and sets completedAt', async () => {
    const repo = createMockRepo(makeAssistanceData({ status: 'IN_PROGRESS' }))
    const useCase = new UpdateAssistanceStatus(repo)
    await useCase.execute('assist-1', 'org-1', 'COMPLETED')
    expect(repo.updateStatus).toHaveBeenCalledWith('assist-1', 'org-1', {
      status: 'COMPLETED',
      completedAt: expect.any(Date),
    })
  })
  it('rejects REQUESTED to COMPLETED', async () => {
    const repo = createMockRepo(makeAssistanceData({ status: 'REQUESTED' }))
    const useCase = new UpdateAssistanceStatus(repo)
    await expect(
      useCase.execute('assist-1', 'org-1', 'COMPLETED')
    ).rejects.toThrow(InvalidAssistanceStatusTransitionError)
  })
  it('rejects COMPLETED to any status', async () => {
    const repo = createMockRepo(makeAssistanceData({ status: 'COMPLETED' }))
    const useCase = new UpdateAssistanceStatus(repo)
    await expect(
      useCase.execute('assist-1', 'org-1', 'REQUESTED')
    ).rejects.toThrow(InvalidAssistanceStatusTransitionError)
  })
  it('rejects IN_PROGRESS to DISPATCHED', async () => {
    const repo = createMockRepo(makeAssistanceData({ status: 'IN_PROGRESS' }))
    const useCase = new UpdateAssistanceStatus(repo)
    await expect(
      useCase.execute('assist-1', 'org-1', 'DISPATCHED')
    ).rejects.toThrow(InvalidAssistanceStatusTransitionError)
  })
  it('throws AssistanceNotFoundError when assistance does not exist', async () => {
    const repo = createMockRepo(null)
    const useCase = new UpdateAssistanceStatus(repo)
    await expect(
      useCase.execute('missing', 'org-1', 'DISPATCHED')
    ).rejects.toThrow(AssistanceNotFoundError)
    expect(repo.updateStatus).not.toHaveBeenCalled()
  })
})
