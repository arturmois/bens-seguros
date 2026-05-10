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
import { makeInvitation } from '../../../../__tests__/helpers/factories.js'
import { deleteInvitationRoute } from '../delete-invitation.js'

vi.mock('@repo/db', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@repo/db')>()
  return {
    ...mod,
    prisma: {
      invitation: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
    },
  }
})

let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(deleteInvitationRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
})

describe('DELETE /api/v1/invitations/:id', () => {
  it('returns 200 with revoked invitation id on success', async () => {
    const { prisma } = await import('@repo/db')
    vi.mocked(prisma.invitation.findFirst).mockResolvedValue(
      makeInvitation() as unknown as Awaited<
        ReturnType<typeof prisma.invitation.findFirst>
      >
    )
    vi.mocked(prisma.invitation.update).mockResolvedValue(
      makeInvitation({ status: 'canceled' }) as unknown as Awaited<
        ReturnType<typeof prisma.invitation.update>
      >
    )
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
    const { prisma } = await import('@repo/db')
    vi.mocked(prisma.invitation.findFirst).mockResolvedValue(null)
    const response = await injectAs(app, {
      method: 'DELETE',
      url: '/api/v1/invitations/nonexistent-id',
      headers: { 'content-type': 'text/plain' },
    })
    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('INVITATION_NOT_FOUND')
  })
  it('cancels the invitation with correct status update', async () => {
    const { prisma } = await import('@repo/db')
    vi.mocked(prisma.invitation.findFirst).mockResolvedValue(
      makeInvitation() as unknown as Awaited<
        ReturnType<typeof prisma.invitation.findFirst>
      >
    )
    vi.mocked(prisma.invitation.update).mockResolvedValue(
      makeInvitation({ status: 'canceled' }) as unknown as Awaited<
        ReturnType<typeof prisma.invitation.update>
      >
    )
    await injectAs(app, {
      method: 'DELETE',
      url: '/api/v1/invitations/invite-id-001',
      headers: { 'content-type': 'text/plain' },
    })
    expect(vi.mocked(prisma.invitation.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'invite-id-001' },
        data: { status: 'canceled' },
      })
    )
  })
})
