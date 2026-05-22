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
import { getGoalsProgressRoute } from '../get-goals-progress.js'

vi.mock('@repo/core', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@repo/core')>()
  return {
    ...mod,
    container: { resolve: vi.fn() },
  }
})

const mockExecute = vi.fn()

const sampleEntry = (
  month: number,
  boardType: 'NEW_INSURANCE' | 'RENEWAL',
  target = 0,
  realized = 0
) => ({
  month,
  boardType,
  targetPremiumCents: target,
  realizedPremiumCents: realized,
})

let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(getGoalsProgressRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockResolve(mockExecute)
})

describe('GET /api/v1/goals/progress', () => {
  it('returns 200 with 24-entry zeroed snapshot when no goals or policies', async () => {
    const entries: ReturnType<typeof sampleEntry>[] = []
    for (let m = 1; m <= 12; m++) {
      entries.push(sampleEntry(m, 'NEW_INSURANCE'))
      entries.push(sampleEntry(m, 'RENEWAL'))
    }
    mockExecute.mockResolvedValue({ year: 2026, entries })
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/goals/progress',
      query: { year: '2026' },
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.year).toBe(2026)
    expect(body.data.entries).toHaveLength(24)
    expect(body.data.entries[0].targetPremiumCents).toBe(0)
  })

  it('returns 200 with merged target + realized', async () => {
    mockExecute.mockResolvedValue({
      year: 2026,
      entries: [
        sampleEntry(3, 'NEW_INSURANCE', 500_00, 350_00),
        sampleEntry(5, 'RENEWAL', 0, 700_00),
      ],
    })
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/goals/progress',
      query: { year: '2026' },
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    const m3New = body.data.entries.find(
      (e: { month: number; boardType: string }) =>
        e.month === 3 && e.boardType === 'NEW_INSURANCE'
    )
    expect(m3New.targetPremiumCents).toBe(500_00)
    expect(m3New.realizedPremiumCents).toBe(350_00)
  })

  it('returns 400 when year is below 2000', async () => {
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/goals/progress',
      query: { year: '1999' },
    })
    expect(response.statusCode).toBe(400)
  })

  it('returns 400 when year is missing', async () => {
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/goals/progress',
    })
    expect(response.statusCode).toBe(400)
  })

  it('forwards organizationId and year to the use case', async () => {
    mockExecute.mockResolvedValue({ year: 2026, entries: [] })
    await injectAs(app, {
      method: 'GET',
      url: '/api/v1/goals/progress',
      query: { year: '2026' },
    })
    expect(mockExecute).toHaveBeenCalledWith({
      organizationId: TEST_ORG_ID,
      year: 2026,
    })
  })
})
