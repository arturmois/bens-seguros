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
} from '../../../../__tests__/helpers/create-test-app.js'
import { mockResolve } from '../../../../__tests__/helpers/mock-use-case.js'
import { listMembersRoute } from '../list-members.js'

vi.mock('@repo/core', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@repo/core')>()
  return {
    ...mod,
    container: { resolve: vi.fn() },
  }
})

const mockExecute = vi.fn()

const sampleItem = (id = 'member-1') => ({
  id,
  userId: 'user-1',
  name: 'Carlos',
  email: 'carlos@user.com',
  role: 'OWNER',
  active: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
})

let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(listMembersRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockResolve(mockExecute)
})

describe('GET /api/v1/members', () => {
  it('returns 200 with paginated member list', async () => {
    mockExecute.mockResolvedValue({
      items: [sampleItem()],
      total: 1,
      nextCursor: null,
    })
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/members',
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
    expect(body.data[0].role).toBe('OWNER')
    expect(body.meta.total).toBe(1)
    expect(body.meta.nextCursor).toBeNull()
  })
  it('returns 200 with empty list when no active members', async () => {
    mockExecute.mockResolvedValue({ items: [], total: 0, nextCursor: null })
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/members',
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.data).toHaveLength(0)
    expect(body.meta.total).toBe(0)
  })
  it('forwards nextCursor from the use case', async () => {
    mockExecute.mockResolvedValue({
      items: [sampleItem('member-id-001')],
      total: 2,
      nextCursor: 'member-id-001',
    })
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/members',
      query: { limit: '1' },
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.meta.nextCursor).toBe('member-id-001')
  })
  it('returns 400 when limit is out of range', async () => {
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/members',
      query: { limit: '0' },
    })
    expect(response.statusCode).toBe(400)
  })
  it('forwards organizationId, limit and cursor to the use case', async () => {
    mockExecute.mockResolvedValue({ items: [], total: 0, nextCursor: null })
    await injectAs(app, {
      method: 'GET',
      url: '/api/v1/members',
      query: { limit: '20', cursor: 'member-id-100' },
    })
    expect(mockExecute).toHaveBeenCalledWith({
      organizationId: TEST_ORG_ID,
      limit: 20,
      cursor: 'member-id-100',
    })
  })
})
