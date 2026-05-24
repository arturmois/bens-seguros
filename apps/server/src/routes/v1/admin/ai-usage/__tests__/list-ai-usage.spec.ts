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
} from '../../../../../__tests__/helpers/create-test-app.js'
import { mockResolve } from '../../../../../__tests__/helpers/mock-use-case.js'
import { listAiUsageRoute } from '../list-ai-usage.js'

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
  app = await createTestApp(listAiUsageRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockResolve(mockExecute)
})

function makeRecord(overrides: Record<string, unknown> = {}) {
  return {
    organizationId: TEST_ORG_ID,
    periodKey: '2026-05',
    channelIdHash: null,
    conversationIdHash: null,
    messageIdHash: null,
    agentIdHash: null,
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    inputQuantity: 100,
    outputQuantity: 50,
    unitType: 'TOKEN',
    inputCostMicrocents: 15,
    outputCostMicrocents: 38,
    countedAsIncluded: null,
    overageCents: null,
    createdAt: new Date('2026-05-23T12:00:00Z'),
    ...overrides,
  }
}

describe('GET /api/v1/admin/ai-usage', () => {
  it('returns 200 with paginated list when periodKey is omitted', async () => {
    mockExecute.mockResolvedValue({
      items: [makeRecord()],
      nextCursor: null,
    })

    const response = await injectAs(app, {
      method: 'GET',
      url: `/api/v1/admin/ai-usage?organizationId=${TEST_ORG_ID}`,
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
    expect(body.meta.nextCursor).toBeNull()
    expect(mockExecute).toHaveBeenCalledWith(
      { organizationId: TEST_ORG_ID, periodKey: undefined },
      { limit: 50, cursor: undefined }
    )
  })

  it('forwards periodKey and cursor to the use case', async () => {
    mockExecute.mockResolvedValue({
      items: [makeRecord({ periodKey: '2026-04' })],
      nextCursor: 'cuid-next',
    })

    const response = await injectAs(app, {
      method: 'GET',
      url: `/api/v1/admin/ai-usage?organizationId=${TEST_ORG_ID}&periodKey=2026-04&cursor=cuid-abc&limit=25`,
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().meta.nextCursor).toBe('cuid-next')
    expect(mockExecute).toHaveBeenCalledWith(
      { organizationId: TEST_ORG_ID, periodKey: '2026-04' },
      { limit: 25, cursor: 'cuid-abc' }
    )
  })

  it('rejects invalid periodKey format with 400', async () => {
    const response = await injectAs(app, {
      method: 'GET',
      url: `/api/v1/admin/ai-usage?organizationId=${TEST_ORG_ID}&periodKey=invalid`,
    })

    expect(response.statusCode).toBe(400)
    expect(mockExecute).not.toHaveBeenCalled()
  })

  it('rejects missing organizationId with 400', async () => {
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/admin/ai-usage',
    })

    expect(response.statusCode).toBe(400)
    expect(mockExecute).not.toHaveBeenCalled()
  })
})
