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
import { markAllAsReadRoute } from '../mark-all-as-read.js'

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(markAllAsReadRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockResolve(mockExecute)
})

describe('POST /api/v1/notifications/read-all', () => {
  it('returns 200 with count of marked notifications', async () => {
    mockExecute.mockResolvedValue({ count: 5 })

    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/notifications/read-all',
      headers: { 'content-type': 'text/plain' },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.count).toBe(5)
  })

  it('returns 200 with count zero when no unread notifications exist', async () => {
    mockExecute.mockResolvedValue({ count: 0 })

    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/notifications/read-all',
      headers: { 'content-type': 'text/plain' },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.data.count).toBe(0)
  })

  it('calls use case with organization id and user id', async () => {
    mockExecute.mockResolvedValue({ count: 3 })

    await injectAs(app, {
      method: 'POST',
      url: '/api/v1/notifications/read-all',
      headers: { 'content-type': 'text/plain' },
    })

    expect(mockExecute).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String)
    )
  })
})
