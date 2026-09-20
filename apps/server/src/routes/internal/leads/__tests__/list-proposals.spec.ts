import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import {
  createTestApp,
  injectAs,
  setTestContext,
} from '../../../../__tests__/helpers/create-test-app.js'
import { listInternalProposalsRoute } from '../list-proposals.js'

const mockExecute = vi.fn()

let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp((fastify) =>
    listInternalProposalsRoute(fastify, {
      listProposalsFor: () => ({ execute: mockExecute }),
    })
  )
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockExecute.mockResolvedValue({
    proposals: [
      {
        id: 'proposal-001',
        branch: 'AUTO',
        stage: 'CAPTURE',
        premiumValueInCents: 150000,
        coverageStartDate: null,
        createdAt: new Date('2025-01-01'),
        clientName: 'João Silva',
      },
    ],
    total: 1,
  })
})

describe('GET /api/internal/proposals', () => {
  it('returns proposals for a given clientId', async () => {
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/internal/proposals',
      query: { clientId: 'client-001' },
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.proposals).toHaveLength(1)
    expect(body.data.proposals[0].id).toBe('proposal-001')
    expect(body.data.proposals[0].clientName).toBe('João Silva')
  })

  it('returns empty list when client is not found by phone', async () => {
    mockExecute.mockResolvedValue({ proposals: [], total: 0 })
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/internal/proposals',
      query: { phone: '11000000000' },
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.data.proposals).toHaveLength(0)
    expect(body.data.total).toBe(0)
  })

  it('returns 400 when neither clientId nor phone is provided', async () => {
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/internal/proposals',
    })
    expect(response.statusCode).toBe(400)
    const body = response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('MISSING_PARAMS')
    expect(body.error.message).toBe(
      'At least one of clientId or phone is required'
    )
    expect(mockExecute).not.toHaveBeenCalled()
  })
})
