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
import { markAsReadRoute } from '../mark-as-read.js'

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(markAsReadRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockResolve(mockExecute)
})

const NOTIFICATION_ID = 'notif-id-001'

describe('POST /api/v1/notifications/:id/read', () => {
  it('returns 200 with null data on success', async () => {
    mockExecute.mockResolvedValue(undefined)
    const response = await injectAs(app, {
      method: 'POST',
      url: `/api/v1/notifications/${NOTIFICATION_ID}/read`,
      headers: { 'content-type': 'text/plain' },
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data).toBeNull()
  })
  it('calls use case with correct notification id', async () => {
    mockExecute.mockResolvedValue(undefined)
    await injectAs(app, {
      method: 'POST',
      url: `/api/v1/notifications/${NOTIFICATION_ID}/read`,
      headers: { 'content-type': 'text/plain' },
    })
    expect(mockExecute).toHaveBeenCalledWith(
      NOTIFICATION_ID,
      expect.any(String),
      expect.any(String)
    )
  })
  it('returns 400 when notification id is empty', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/notifications//read',
      headers: { 'content-type': 'text/plain' },
    })
    expect(response.statusCode).toBe(400)
  })
})
