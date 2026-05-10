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
import { updateMemberRoleRoute } from '../update-member-role.js'

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(updateMemberRoleRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockResolve(mockExecute)
})

const makeUpdatedMember = () => ({
  id: 'member-id-001',
  userId: 'user-id-002',
  organizationId: 'org-id-001',
  role: 'ADMIN',
  active: true,
})

describe('PUT /api/v1/members/:id/role', () => {
  it('returns 200 with updated member data on success', async () => {
    mockExecute.mockResolvedValue({
      member: makeUpdatedMember(),
      before: { role: 'COMMERCIAL' },
    })
    const response = await injectAs(app, {
      method: 'PUT',
      url: '/api/v1/members/member-id-001/role',
      payload: { role: 'ADMIN' },
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.role).toBe('ADMIN')
  })
  it('returns 404 when member is not found', async () => {
    mockResolveError('MEMBER_NOT_FOUND', 'Member not found')
    const response = await injectAs(app, {
      method: 'PUT',
      url: '/api/v1/members/nonexistent-id/role',
      payload: { role: 'ADMIN' },
    })
    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.error.code).toBe('MEMBER_NOT_FOUND')
  })
  it('returns 403 when caller lacks permission to assign role', async () => {
    mockResolveError('ROLE_HIERARCHY_VIOLATION', 'Role hierarchy violation')
    const response = await injectAs(app, {
      method: 'PUT',
      url: '/api/v1/members/member-id-001/role',
      payload: { role: 'ADMIN' },
    })
    expect(response.statusCode).toBe(403)
    const body = response.json()
    expect(body.error.code).toBe('ROLE_HIERARCHY_VIOLATION')
  })
  it('returns 400 when role is invalid', async () => {
    const response = await injectAs(app, {
      method: 'PUT',
      url: '/api/v1/members/member-id-001/role',
      payload: { role: 'SUPERADMIN' },
    })
    expect(response.statusCode).toBe(400)
  })
  it('returns 400 when body is missing', async () => {
    const response = await injectAs(app, {
      method: 'PUT',
      url: '/api/v1/members/member-id-001/role',
      headers: { 'content-type': 'text/plain' },
    })
    expect(response.statusCode).toBe(400)
  })
})
