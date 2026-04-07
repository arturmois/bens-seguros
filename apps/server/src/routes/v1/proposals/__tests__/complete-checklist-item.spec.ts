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
  TEST_USER_ID,
} from '../../../../__tests__/helpers/create-test-app.js'
import {
  mockResolve,
  mockResolveError,
} from '../../../../__tests__/helpers/mock-use-case.js'
import { completeChecklistItemRoute } from '../complete-checklist-item.js'

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
  isCompleted: true,
  completedAt: new Date('2025-06-01'),
  completedBy: TEST_USER_ID,
  createdAt: new Date('2025-01-01'),
  ...overrides,
})

beforeAll(async () => {
  app = await createTestApp(completeChecklistItemRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockExecute.mockResolvedValue(makeChecklistItem())
  mockResolve(mockExecute)
})

describe('POST /api/v1/proposals/:id/checklist/:itemId/complete', () => {
  it('returns 200 with completed checklist item', async () => {
    // No body — omit content-type to avoid FST_ERR_CTP_EMPTY_JSON_BODY
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/proposals/p-001/checklist/item-001/complete',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.isCompleted).toBe(true)
    expect(body.data.id).toBe('item-001')
  })

  it('calls use case with itemId, proposalId, organizationId, and userId', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/v1/proposals/p-001/checklist/item-001/complete',
    })

    expect(mockExecute).toHaveBeenCalledWith(
      'item-001',
      'p-001',
      TEST_ORG_ID,
      TEST_USER_ID
    )
  })

  it('returns 404 when checklist item does not exist', async () => {
    mockResolveError('PROPOSAL_NOT_FOUND', 'Checklist item not found')

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/proposals/p-001/checklist/nonexistent/complete',
    })

    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.success).toBe(false)
  })

  it('returns completedBy and completedAt in response', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/proposals/p-001/checklist/item-001/complete',
    })

    const body = response.json()
    expect(body.data.completedBy).toBe(TEST_USER_ID)
    expect(body.data.completedAt).toBeDefined()
  })
})
