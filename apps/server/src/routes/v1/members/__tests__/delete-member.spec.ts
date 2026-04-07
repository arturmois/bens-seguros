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
import {
  mockResolve,
  mockResolveError,
} from '../../../../__tests__/helpers/mock-use-case.js'
import { deleteMemberRoute } from '../delete-member.js'

vi.mock('@repo/db', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@repo/db')>()
  return {
    ...mod,
    prisma: {
      member: {
        findFirst: vi.fn(),
      },
    },
  }
})

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(deleteMemberRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockResolve(mockExecute)
})

describe('DELETE /api/v1/members/:id', () => {
  it('returns 200 with deactivated member id on success', async () => {
    const { prisma } = await import('@repo/db')
    vi.mocked(prisma.member.findFirst).mockResolvedValue({
      role: 'ADMIN',
      userId: 'other-user-id',
    } as never)
    mockExecute.mockResolvedValue(undefined)

    const response = await injectAs(app, {
      method: 'DELETE',
      url: '/api/v1/members/member-id-001',
      headers: { 'content-type': 'text/plain' },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.id).toBe('member-id-001')
  })

  it('returns 404 when member is not found', async () => {
    const { prisma } = await import('@repo/db')
    vi.mocked(prisma.member.findFirst).mockResolvedValue(null)
    mockResolveError('MEMBER_NOT_FOUND', 'Member not found')

    const response = await injectAs(app, {
      method: 'DELETE',
      url: '/api/v1/members/nonexistent-id',
      headers: { 'content-type': 'text/plain' },
    })

    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('MEMBER_NOT_FOUND')
  })

  it('returns 422 when trying to remove the last owner', async () => {
    const { prisma } = await import('@repo/db')
    vi.mocked(prisma.member.findFirst).mockResolvedValue({
      role: 'OWNER',
      userId: 'other-user-id',
    } as never)
    mockResolveError('LAST_OWNER', 'Cannot remove the last owner')

    const response = await injectAs(app, {
      method: 'DELETE',
      url: '/api/v1/members/member-id-001',
      headers: { 'content-type': 'text/plain' },
    })

    expect(response.statusCode).toBe(422)
    const body = response.json()
    expect(body.error.code).toBe('LAST_OWNER')
  })

  it('returns 422 when member tries to remove themselves', async () => {
    const { prisma } = await import('@repo/db')
    vi.mocked(prisma.member.findFirst).mockResolvedValue({
      role: 'ADMIN',
      userId: 'own-user-id',
    } as never)
    mockResolveError('SELF_REMOVAL', 'Cannot remove yourself')

    const response = await injectAs(app, {
      method: 'DELETE',
      url: '/api/v1/members/member-id-001',
      headers: { 'content-type': 'text/plain' },
    })

    expect(response.statusCode).toBe(422)
    const body = response.json()
    expect(body.error.code).toBe('SELF_REMOVAL')
  })
})
