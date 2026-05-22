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
  TEST_ORG_ID,
} from '../../../../__tests__/helpers/create-test-app.js'
import { mockResolve } from '../../../../__tests__/helpers/mock-use-case.js'
import { upsertGoalsByYearRoute } from '../upsert-goals-by-year.js'

vi.mock('@repo/core', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@repo/core')>()
  return {
    ...mod,
    container: { resolve: vi.fn() },
  }
})

const mockExecute = vi.fn()

let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(upsertGoalsByYearRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockResolve(mockExecute)
})

describe('PUT /api/v1/goals/:year', () => {
  it('returns 200 + count when role is MANAGER', async () => {
    setTestContext({ role: 'MANAGER' })
    mockExecute.mockResolvedValue(undefined)
    const response = await injectAs(app, {
      method: 'PUT',
      url: '/api/v1/goals/2026',
      payload: {
        entries: [
          { month: 1, boardType: 'NEW_INSURANCE', targetPremiumCents: 100_00 },
          { month: 1, boardType: 'RENEWAL', targetPremiumCents: 200_00 },
        ],
      },
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.count).toBe(2)
    expect(mockExecute).toHaveBeenCalledWith({
      organizationId: TEST_ORG_ID,
      year: 2026,
      entries: [
        { month: 1, boardType: 'NEW_INSURANCE', targetPremiumCents: 100_00 },
        { month: 1, boardType: 'RENEWAL', targetPremiumCents: 200_00 },
      ],
    })
  })

  it('returns 400 when entries contain ENDORSEMENT boardType', async () => {
    setTestContext({ role: 'MANAGER' })
    const response = await injectAs(app, {
      method: 'PUT',
      url: '/api/v1/goals/2026',
      payload: {
        entries: [
          { month: 1, boardType: 'ENDORSEMENT', targetPremiumCents: 100_00 },
        ],
      },
    })
    expect(response.statusCode).toBe(400)
    expect(mockExecute).not.toHaveBeenCalled()
  })

  it('returns 400 when targetPremiumCents is negative', async () => {
    setTestContext({ role: 'MANAGER' })
    const response = await injectAs(app, {
      method: 'PUT',
      url: '/api/v1/goals/2026',
      payload: {
        entries: [
          { month: 1, boardType: 'NEW_INSURANCE', targetPremiumCents: -1 },
        ],
      },
    })
    expect(response.statusCode).toBe(400)
  })

  it('returns 400 when month is out of range', async () => {
    setTestContext({ role: 'MANAGER' })
    const response = await injectAs(app, {
      method: 'PUT',
      url: '/api/v1/goals/2026',
      payload: {
        entries: [
          { month: 13, boardType: 'NEW_INSURANCE', targetPremiumCents: 100_00 },
        ],
      },
    })
    expect(response.statusCode).toBe(400)
  })

  it('returns 400 when year param is invalid', async () => {
    setTestContext({ role: 'MANAGER' })
    const response = await injectAs(app, {
      method: 'PUT',
      url: '/api/v1/goals/abc',
      payload: { entries: [] },
    })
    expect(response.statusCode).toBe(400)
  })

  it('accepts empty entries array as no-op', async () => {
    setTestContext({ role: 'MANAGER' })
    mockExecute.mockResolvedValue(undefined)
    const response = await injectAs(app, {
      method: 'PUT',
      url: '/api/v1/goals/2026',
      payload: { entries: [] },
    })
    expect(response.statusCode).toBe(200)
    expect(response.json().data.count).toBe(0)
  })
})
