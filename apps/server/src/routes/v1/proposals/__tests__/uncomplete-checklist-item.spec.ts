import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
} from 'vitest'
import {
  createTestApp,
  setTestContext,
  TEST_ORG_ID,
} from '../../../../__tests__/helpers/create-test-app.js'
import {
  mockResolve,
  mockResolveError,
} from '../../../../__tests__/helpers/mock-use-case.js'
import { uncompleteChecklistItemRoute } from '../uncomplete-checklist-item.js'

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

const makeChecklistItem = (
  overrides: Partial<Record<string, unknown>> = {}
) => ({
  id: 'item-001',
  proposalId: 'p-001',
  itemKey: 'CLIENT_DOCUMENT',
  label: 'Documento do cliente',
  isRequired: true,
  isCompleted: false,
  completedAt: null,
  completedBy: null,
  createdAt: new Date('2025-01-01'),
  ...overrides,
})

beforeAll(async () => {
  app = await createTestApp(uncompleteChecklistItemRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockExecute.mockResolvedValue(makeChecklistItem())
  mockResolve(mockExecute)
})

describe('DELETE /api/v1/proposals/:id/checklist/:itemId/complete', () => {
  it('returns 200 with uncompleted checklist item', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/proposals/p-001/checklist/item-001/complete',
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.isCompleted).toBe(false)
    expect(body.data.id).toBe('item-001')
  })
  it('calls use case with itemId, proposalId, organizationId (no userId)', async () => {
    await app.inject({
      method: 'DELETE',
      url: '/api/v1/proposals/p-001/checklist/item-001/complete',
    })
    expect(mockExecute).toHaveBeenCalledWith('item-001', 'p-001', TEST_ORG_ID)
  })
  it('returns 404 when proposal does not exist', async () => {
    mockResolveError('PROPOSAL_NOT_FOUND', 'Proposta missing não encontrada')
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/proposals/missing/checklist/item-001/complete',
    })
    expect(response.statusCode).toBe(404)
    expect(response.json().success).toBe(false)
  })
  it('clears completedBy and completedAt in response', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/proposals/p-001/checklist/item-001/complete',
    })
    const body = response.json()
    expect(body.data.completedBy).toBeNull()
    expect(body.data.completedAt).toBeNull()
  })
})
