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
import { listInvitationsRoute } from '../list-invitations.js'

vi.mock('@repo/core', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@repo/core')>()
  return {
    ...mod,
    container: { resolve: vi.fn() },
  }
})

const mockExecute = vi.fn()

const sampleInvitation = (id = 'inv-1') => ({
  id,
  email: 'invited@user.com',
  organizationId: TEST_ORG_ID,
  role: 'COMMERCIAL',
  status: 'pending',
  expiresAt: new Date('2026-12-31'),
  inviterId: 'user-1',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
})

let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(listInvitationsRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockResolve(mockExecute)
})

describe('GET /api/v1/invitations', () => {
  it('returns 200 with pending invitation list', async () => {
    mockExecute.mockResolvedValue({
      items: [sampleInvitation()],
      total: 1,
      nextCursor: null,
    })
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/invitations',
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
    expect(body.data[0].email).toBe('invited@user.com')
    expect(body.data[0].status).toBe('pending')
    expect(body.meta.total).toBe(1)
    expect(body.meta.nextCursor).toBeNull()
  })
  it('returns 200 with empty list when no pending invitations', async () => {
    mockExecute.mockResolvedValue({ items: [], total: 0, nextCursor: null })
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/invitations',
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.data).toHaveLength(0)
    expect(body.meta.total).toBe(0)
  })
  it('forwards nextCursor from the use case', async () => {
    mockExecute.mockResolvedValue({
      items: [sampleInvitation('invite-id-001')],
      total: 2,
      nextCursor: 'invite-id-001',
    })
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/invitations',
      query: { limit: '1' },
    })
    expect(response.statusCode).toBe(200)
    expect(response.json().meta.nextCursor).toBe('invite-id-001')
  })
  it('returns 400 when limit is out of range', async () => {
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/invitations',
      query: { limit: '0' },
    })
    expect(response.statusCode).toBe(400)
  })
  it('forwards organizationId, limit and cursor to the use case', async () => {
    mockExecute.mockResolvedValue({ items: [], total: 0, nextCursor: null })
    await injectAs(app, {
      method: 'GET',
      url: '/api/v1/invitations',
      query: { limit: '15', cursor: 'inv-100' },
    })
    expect(mockExecute).toHaveBeenCalledWith({
      organizationId: TEST_ORG_ID,
      limit: 15,
      cursor: 'inv-100',
    })
  })
})
