import { describe, expect, it, vi } from 'vitest'
import type {
  AssistanceData,
  AssistanceRepository,
} from '../domain/assistance-repository.js'
import { ListAssistances } from './list-assistances.js'

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

function makeMockRepo(): AssistanceRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findMany: vi.fn().mockResolvedValue({
      items: [makeAssistanceData()],
      total: 1,
      nextCursor: null,
    }),
    updateStatus: vi.fn(),
  }
}

describe('ListAssistances', () => {
  it('maps statusGroup=open to not COMPLETED filter', async () => {
    const repo = makeMockRepo()
    const useCase = new ListAssistances(repo)
    await useCase.execute(
      { organizationId: 'org-1', statusGroup: 'open' },
      { limit: 20 }
    )
    expect(repo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ statusGroup: 'open' }),
      expect.anything()
    )
  })
  it('maps statusGroup=closed to COMPLETED filter', async () => {
    const repo = makeMockRepo()
    const useCase = new ListAssistances(repo)
    await useCase.execute(
      { organizationId: 'org-1', statusGroup: 'closed' },
      { limit: 20 }
    )
    expect(repo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ statusGroup: 'closed' }),
      expect.anything()
    )
  })
  it('passes status filter when statusGroup is not provided', async () => {
    const repo = makeMockRepo()
    const useCase = new ListAssistances(repo)
    await useCase.execute(
      { organizationId: 'org-1', status: 'DISPATCHED' },
      { limit: 20 }
    )
    expect(repo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'DISPATCHED' }),
      expect.anything()
    )
  })
  it('returns paginated assistances list', async () => {
    const repo = makeMockRepo()
    const useCase = new ListAssistances(repo)
    const result = await useCase.execute(
      { organizationId: 'org-1' },
      { limit: 20 }
    )
    expect(result.items).toHaveLength(1)
    expect(result.total).toBe(1)
    expect(result.nextCursor).toBeNull()
  })
  it('forwards statusIn array to repository', async () => {
    const repo = makeMockRepo()
    const useCase = new ListAssistances(repo)
    await useCase.execute(
      {
        organizationId: 'org-1',
        statusIn: ['REQUESTED', 'DISPATCHED'],
      },
      { limit: 20 }
    )
    expect(repo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ statusIn: ['REQUESTED', 'DISPATCHED'] }),
      expect.anything()
    )
  })
  it('forwards typeIn array to repository', async () => {
    const repo = makeMockRepo()
    const useCase = new ListAssistances(repo)
    await useCase.execute(
      { organizationId: 'org-1', typeIn: ['TOW_TRUCK', 'MECHANIC'] },
      { limit: 20 }
    )
    expect(repo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ typeIn: ['TOW_TRUCK', 'MECHANIC'] }),
      expect.anything()
    )
  })
})
