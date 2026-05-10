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
import {
  mockResolve,
  mockResolveError,
} from '../../../../__tests__/helpers/mock-use-case.js'
import { createInvitationRoute } from '../create-invitation.js'

vi.mock('@repo/core', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@repo/core')>()
  return {
    ...mod,
    container: { resolve: vi.fn() },
  }
})

const mockExecute = vi.fn()

const sampleInvitation = {
  id: 'inv-1',
  email: 'newmember@user.com',
  organizationId: TEST_ORG_ID,
  role: 'COMMERCIAL',
  status: 'pending',
  expiresAt: new Date('2026-12-31'),
  inviterId: TEST_USER_ID,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(createInvitationRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext({ role: 'OWNER' })
  mockResolve(mockExecute)
})

const validBody = { email: 'newmember@user.com', role: 'COMMERCIAL' }

describe('POST /api/v1/invitations', () => {
  it('returns 201 with created invitation on success', async () => {
    mockExecute.mockResolvedValue(sampleInvitation)
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/invitations',
      payload: validBody,
    })
    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.id).toBe('inv-1')
    expect(body.data.email).toBe('newmember@user.com')
    expect(body.data.status).toBe('pending')
  })
  it('returns 409 when email already has an active member or invitation', async () => {
    mockResolveError('DUPLICATE_INVITATION', 'Already invited')
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/invitations',
      payload: validBody,
    })
    expect(response.statusCode).toBe(409)
    expect(response.json().error.code).toBe('DUPLICATE_INVITATION')
  })
  it('returns 403 when caller role cannot manage target role', async () => {
    mockResolveError('ROLE_HIERARCHY_VIOLATION', 'Insufficient role')
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/invitations',
      payload: validBody,
    })
    expect(response.statusCode).toBe(403)
    expect(response.json().error.code).toBe('ROLE_HIERARCHY_VIOLATION')
  })
  it('returns 400 when role is invalid', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/invitations',
      payload: { email: 'a@b.com', role: 'OWNER' },
    })
    expect(response.statusCode).toBe(400)
  })
  it('returns 400 when email is invalid', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/invitations',
      payload: { email: 'not-an-email', role: 'COMMERCIAL' },
    })
    expect(response.statusCode).toBe(400)
  })
  it('forwards organizationId, callerRole, inviterUserId, inviterName to the use case', async () => {
    mockExecute.mockResolvedValue(sampleInvitation)
    await injectAs(app, {
      method: 'POST',
      url: '/api/v1/invitations',
      payload: validBody,
    })
    expect(mockExecute).toHaveBeenCalledWith({
      organizationId: TEST_ORG_ID,
      email: 'newmember@user.com',
      role: 'COMMERCIAL',
      callerRole: 'OWNER',
      inviterUserId: TEST_USER_ID,
      inviterName: 'Test User',
    })
  })
})
