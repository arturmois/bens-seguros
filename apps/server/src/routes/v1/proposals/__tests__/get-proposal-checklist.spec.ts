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
  injectAs,
  setTestContext,
  TEST_ORG_ID,
} from '../../../../__tests__/helpers/create-test-app.js'
import {
  mockResolve,
  mockResolveError,
} from '../../../../__tests__/helpers/mock-use-case.js'
import { getProposalChecklistRoute } from '../get-proposal-checklist.js'

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

const makeChecklistResult = () => ({
  items: [
    makeChecklistItem(),
    makeChecklistItem({
      id: 'item-002',
      itemKey: 'VEHICLE_DOCUMENT',
      label: 'Documento do veículo',
      isRequired: false,
    }),
  ],
  summary: {
    total: 2,
    completed: 0,
    required: 1,
    requiredCompleted: 0,
    canAdvance: false,
  },
})

beforeAll(async () => {
  app = await createTestApp(getProposalChecklistRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockExecute.mockResolvedValue(makeChecklistResult())
  mockResolve(mockExecute)
})

describe('GET /api/v1/proposals/:id/checklist', () => {
  it('returns 200 with checklist items and summary', async () => {
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/proposals/p-001/checklist',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.items).toHaveLength(2)
    expect(body.data.summary).toBeDefined()
  })

  it('returns correct summary fields', async () => {
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/proposals/p-001/checklist',
    })

    const body = response.json()
    expect(body.data.summary.total).toBe(2)
    expect(body.data.summary.required).toBe(1)
    expect(body.data.summary.canAdvance).toBe(false)
  })

  it('calls use case with proposal id and organizationId', async () => {
    await injectAs(app, {
      method: 'GET',
      url: '/api/v1/proposals/p-001/checklist',
    })

    expect(mockExecute).toHaveBeenCalledWith('p-001', TEST_ORG_ID)
  })

  it('returns 404 when proposal does not exist', async () => {
    mockResolveError('PROPOSAL_NOT_FOUND', 'Proposal not found')

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/proposals/nonexistent/checklist',
    })

    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.error.code).toBe('PROPOSAL_NOT_FOUND')
  })

  it('returns canAdvance=true when all required items are completed', async () => {
    mockExecute.mockResolvedValue({
      items: [
        makeChecklistItem({
          isCompleted: true,
          completedAt: new Date(),
          completedBy: 'user-001',
        }),
      ],
      summary: {
        total: 1,
        completed: 1,
        required: 1,
        requiredCompleted: 1,
        canAdvance: true,
      },
    })

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/proposals/p-001/checklist',
    })

    const body = response.json()
    expect(body.data.summary.canAdvance).toBe(true)
  })
})
