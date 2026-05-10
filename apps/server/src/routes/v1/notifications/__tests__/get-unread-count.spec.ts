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
import { getUnreadCountRoute } from '../get-unread-count.js'

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(getUnreadCountRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockResolve(mockExecute)
})

describe('GET /api/v1/notifications/unread-count', () => {
  it('returns 200 with unread count', async () => {
    mockExecute.mockResolvedValue({ count: 7 })
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/notifications/unread-count',
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.count).toBe(7)
  })
  it('returns 200 with count zero when all notifications are read', async () => {
    mockExecute.mockResolvedValue({ count: 0 })
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/notifications/unread-count',
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.data.count).toBe(0)
  })
  it('calls use case with organization id and user id', async () => {
    mockExecute.mockResolvedValue({ count: 3 })
    await injectAs(app, {
      method: 'GET',
      url: '/api/v1/notifications/unread-count',
    })
    expect(mockExecute).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String)
    )
  })
})
