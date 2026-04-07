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
  TEST_ORG_ID,
  TEST_USER_ID,
} from '../../../../__tests__/helpers/create-test-app.js'
import { mockResolve } from '../../../../__tests__/helpers/mock-use-case.js'
import { listNotificationsRoute } from '../list-notifications.js'

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(listNotificationsRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockResolve(mockExecute)
})

const makeNotification = (
  overrides: Partial<Record<string, unknown>> = {}
) => ({
  id: 'notif-id-001',
  organizationId: TEST_ORG_ID,
  userId: TEST_USER_ID,
  type: 'PROPOSAL_STAGE_CHANGED',
  title: 'Proposta atualizada',
  body: 'Sua proposta foi atualizada.',
  entityType: 'proposal',
  entityId: 'proposal-id-001',
  read: false,
  readAt: null,
  emailSent: false,
  createdAt: new Date().toISOString(),
  ...overrides,
})

describe('GET /api/v1/notifications', () => {
  it('returns 200 with paginated notification list', async () => {
    mockExecute.mockResolvedValue({
      data: [makeNotification()],
      nextCursor: null,
    })

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/notifications',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
    expect(body.data[0].title).toBe('Proposta atualizada')
    expect(body.meta.nextCursor).toBeNull()
  })

  it('returns 200 with empty list when no notifications exist', async () => {
    mockExecute.mockResolvedValue({ data: [], nextCursor: null })

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/notifications',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.data).toHaveLength(0)
  })

  it('returns 200 with nextCursor when more pages exist', async () => {
    const notifications = Array.from({ length: 2 }, (_, i) =>
      makeNotification({ id: `notif-id-00${i + 1}` })
    )
    mockExecute.mockResolvedValue({
      data: notifications,
      nextCursor: 'notif-id-002',
    })

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/notifications',
      query: { limit: '2' },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.meta.nextCursor).toBe('notif-id-002')
  })

  it('filters by read status when query param is provided', async () => {
    mockExecute.mockResolvedValue({ data: [], nextCursor: null })

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/notifications',
      query: { read: 'false' },
    })

    expect(response.statusCode).toBe(200)
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({ read: false })
    )
  })

  it('returns 400 when limit is out of range', async () => {
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/notifications',
      query: { limit: '0' },
    })

    expect(response.statusCode).toBe(400)
  })
})
