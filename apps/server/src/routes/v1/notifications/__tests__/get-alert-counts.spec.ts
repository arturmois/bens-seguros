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
} from '../../../../__tests__/helpers/create-test-app.js'
import { mockResolve } from '../../../../__tests__/helpers/mock-use-case.js'
import { getAlertCountsRoute } from '../get-alert-counts.js'

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(getAlertCountsRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockResolve(mockExecute)
})

describe('GET /api/v1/notifications/alert-counts', () => {
  it('returns 200 with alert counts by entity type', async () => {
    mockExecute.mockResolvedValue({ proposal: 3, claim: 1, policy: 0 })
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/notifications/alert-counts',
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.proposal).toBe(3)
    expect(body.data.claim).toBe(1)
    expect(body.data.policy).toBe(0)
  })
  it('returns 200 with empty record when no alerts exist', async () => {
    mockExecute.mockResolvedValue({})
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/notifications/alert-counts',
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data).toEqual({})
  })
  it('calls use case with organization id and user id', async () => {
    mockExecute.mockResolvedValue({})
    await injectAs(app, {
      method: 'GET',
      url: '/api/v1/notifications/alert-counts',
    })
    expect(mockExecute).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String)
    )
  })
})
