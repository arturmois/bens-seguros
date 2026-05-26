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

const queryRawMock = vi.fn()

vi.mock('@repo/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@repo/db')>()
  return {
    ...actual,
    prismaAdmin: {
      $queryRaw: (...args: unknown[]) => queryRawMock(...args),
    },
  }
})

const { getBillingAiUsageRoute } = await import('../get-ai-usage.js')

let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp((appInstance) =>
    getBillingAiUsageRoute(appInstance)
  )
})

afterAll(() => app.close())

beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
})

describe('GET /api/v1/billing/ai-usage', () => {
  it('returns 200 with empty series and zero totals when no usage', async () => {
    queryRawMock.mockResolvedValue([])
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/billing/ai-usage',
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.series).toEqual([])
    expect(body.data.totals.inputTokens).toBe(0)
    expect(body.data.totals.outputTokens).toBe(0)
    expect(body.data.totals.totalCostMicrocents).toBe(0)
    expect(body.data.totals.messageCount).toBe(0)
  })

  it('serializes day as YYYY-MM-DD and converts bigints to numbers', async () => {
    queryRawMock.mockResolvedValue([
      {
        day: new Date('2026-05-20T00:00:00Z'),
        input_quantity: 1000n,
        output_quantity: 500n,
        total_cost_microcents: 12500n,
        message_count: 7n,
      },
    ])
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/billing/ai-usage',
    })
    const body = response.json()
    expect(body.data.series).toHaveLength(1)
    expect(body.data.series[0]).toEqual({
      date: '2026-05-20',
      inputTokens: 1000,
      outputTokens: 500,
      totalCostMicrocents: 12500,
      messageCount: 7,
    })
  })

  it('aggregates totals over all series rows', async () => {
    queryRawMock.mockResolvedValue([
      {
        day: new Date('2026-05-19T00:00:00Z'),
        input_quantity: 100,
        output_quantity: 50,
        total_cost_microcents: 500,
        message_count: 2,
      },
      {
        day: new Date('2026-05-20T00:00:00Z'),
        input_quantity: 200,
        output_quantity: 100,
        total_cost_microcents: 1000,
        message_count: 3,
      },
    ])
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/billing/ai-usage',
    })
    const body = response.json()
    expect(body.data.totals.inputTokens).toBe(300)
    expect(body.data.totals.outputTokens).toBe(150)
    expect(body.data.totals.totalCostMicrocents).toBe(1500)
    expect(body.data.totals.messageCount).toBe(5)
  })

  it('treats null SUM/COUNT values as 0 (empty group edge case)', async () => {
    queryRawMock.mockResolvedValue([
      {
        day: new Date('2026-05-20T00:00:00Z'),
        input_quantity: null,
        output_quantity: null,
        total_cost_microcents: null,
        message_count: null,
      },
    ])
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/billing/ai-usage',
    })
    const body = response.json()
    expect(body.data.series[0]).toEqual({
      date: '2026-05-20',
      inputTokens: 0,
      outputTokens: 0,
      totalCostMicrocents: 0,
      messageCount: 0,
    })
  })

  it('accepts ?days=7 query param', async () => {
    queryRawMock.mockResolvedValue([])
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/billing/ai-usage?days=7',
    })
    expect(response.statusCode).toBe(200)
    expect(queryRawMock).toHaveBeenCalledTimes(1)
  })

  it('returns 400 when days < 1', async () => {
    queryRawMock.mockResolvedValue([])
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/billing/ai-usage?days=0',
    })
    expect(response.statusCode).toBe(400)
  })

  it('returns 400 when days > 90', async () => {
    queryRawMock.mockResolvedValue([])
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/billing/ai-usage?days=91',
    })
    expect(response.statusCode).toBe(400)
  })

  it('throws 500 when bigint aggregate exceeds Number.MAX_SAFE_INTEGER', async () => {
    queryRawMock.mockResolvedValue([
      {
        day: new Date('2026-05-20T00:00:00Z'),
        input_quantity: BigInt(Number.MAX_SAFE_INTEGER) + 1n,
        output_quantity: 0n,
        total_cost_microcents: 0n,
        message_count: 1n,
      },
    ])
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/billing/ai-usage',
    })
    expect(response.statusCode).toBe(500)
  })

  it('returns periodStart and periodEnd as ISO strings', async () => {
    queryRawMock.mockResolvedValue([])
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/billing/ai-usage',
    })
    const body = response.json()
    expect(body.data.totals.periodStart).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
    )
    expect(body.data.totals.periodEnd).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
    )
  })
})
