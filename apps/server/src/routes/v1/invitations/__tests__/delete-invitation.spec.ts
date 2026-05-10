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
import {
  mockResolve,
  mockResolveError,
} from '../../../../__tests__/helpers/mock-use-case.js'
import { deleteInvitationRoute } from '../delete-invitation.js'

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
  app = await createTestApp(deleteInvitationRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockResolve(mockExecute)
})

describe('DELETE /api/v1/invitations/:id', () => {
  it('returns 200 with revoked invitation id on success', async () => {
    mockExecute.mockResolvedValue({
      id: 'invite-id-001',
      email: 'invited@user.com',
      organizationId: TEST_ORG_ID,
      role: 'COMMERCIAL',
      status: 'canceled',
      expiresAt: new Date('2026-12-31'),
      inviterId: 'user-1',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-02'),
    })
    const response = await injectAs(app, {
      method: 'DELETE',
      url: '/api/v1/invitations/invite-id-001',
      headers: { 'content-type': 'text/plain' },
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.id).toBe('invite-id-001')
  })
  it('returns 404 when invitation is not found', async () => {
    mockResolveError('INVITATION_NOT_FOUND', 'Invitation not found')
    const response = await injectAs(app, {
      method: 'DELETE',
      url: '/api/v1/invitations/nonexistent-id',
      headers: { 'content-type': 'text/plain' },
    })
    expect(response.statusCode).toBe(404)
    expect(response.json().error.code).toBe('INVITATION_NOT_FOUND')
  })
  it('forwards id and organizationId to the use case', async () => {
    mockExecute.mockResolvedValue({
      id: 'invite-id-001',
      email: 'invited@user.com',
      organizationId: TEST_ORG_ID,
      role: 'VIEWER',
      status: 'canceled',
      expiresAt: new Date(),
      inviterId: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    await injectAs(app, {
      method: 'DELETE',
      url: '/api/v1/invitations/invite-id-001',
      headers: { 'content-type': 'text/plain' },
    })
    expect(mockExecute).toHaveBeenCalledWith('invite-id-001', TEST_ORG_ID)
  })
})
