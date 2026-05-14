import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
} from 'vitest'
import { container } from '@repo/core'
import {
  createTestApp,
  injectAs,
  setTestContext,
  TEST_ORG_ID,
} from '../../../../__tests__/helpers/create-test-app.js'
import { updateInternalProposalDetailsRoute } from '../update-proposal-details.js'

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

const makeAutoDetails = () => ({
  details: {
    branch: 'AUTO',
    vehicle: 'Toyota Corolla',
    manufacturingYear: 2022,
    modelYear: 2023,
  },
  premiumValueInCents: 150000,
  commissionBasisPoints: 1000,
})

beforeAll(async () => {
  app = await createTestApp(updateInternalProposalDetailsRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockExecute.mockResolvedValue(undefined)
  vi.mocked(container.resolve).mockImplementation((token: unknown) => {
    if (typeof token === 'function') return { execute: mockExecute }
    return null
  })
})

describe('PUT /api/internal/proposals/:id/details', () => {
  it('updates proposal details successfully and returns 200', async () => {
    const response = await injectAs(app, {
      method: 'PUT',
      url: '/api/internal/proposals/p-001/details',
      payload: makeAutoDetails(),
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.success).toBe(true)
    expect(mockExecute).toHaveBeenCalledWith(
      'p-001',
      TEST_ORG_ID,
      expect.objectContaining({ premiumValueInCents: 150000 })
    )
  })
  it('returns 400 when details are missing the branch field', async () => {
    const response = await injectAs(app, {
      method: 'PUT',
      url: '/api/internal/proposals/p-001/details',
      payload: {
        details: { vehicle: 'Toyota Corolla' },
        premiumValueInCents: 150000,
        commissionBasisPoints: 1000,
      },
    })
    expect(response.statusCode).toBe(400)
    const body = response.json()
    expect(body.error.code).toBe('INVALID_DETAILS')
  })
  it('returns 404 when proposal does not exist', async () => {
    const error = Object.assign(new Error('Proposal not found'), {
      code: 'PROPOSAL_NOT_FOUND',
    })
    vi.mocked(container.resolve).mockImplementation((token: unknown) => {
      if (typeof token === 'function') {
        return { execute: vi.fn().mockRejectedValue(error) }
      }
      return null
    })
    const response = await injectAs(app, {
      method: 'PUT',
      url: '/api/internal/proposals/nonexistent/details',
      payload: makeAutoDetails(),
    })
    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.error.code).toBe('PROPOSAL_NOT_FOUND')
  })
  it('returns 400 when body is missing details field', async () => {
    const response = await injectAs(app, {
      method: 'PUT',
      url: '/api/internal/proposals/p-001/details',
      payload: { premiumValueInCents: 150000 },
    })
    expect(response.statusCode).toBeGreaterThanOrEqual(400)
  })
  it('accepts LIFE branch details', async () => {
    const response = await injectAs(app, {
      method: 'PUT',
      url: '/api/internal/proposals/p-001/details',
      payload: {
        details: { branch: 'LIFE', occupation: 'Médico' },
        premiumValueInCents: 50000,
        commissionBasisPoints: 500,
      },
    })
    expect(response.statusCode).toBe(200)
    expect(mockExecute).toHaveBeenCalledWith(
      'p-001',
      TEST_ORG_ID,
      expect.objectContaining({
        details: expect.objectContaining({ branch: 'LIFE' }),
      })
    )
  })
})
