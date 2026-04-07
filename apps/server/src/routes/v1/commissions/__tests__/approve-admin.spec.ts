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
  setTestContext,
  TEST_ORG_ID,
  TEST_USER_ID,
} from '../../../../__tests__/helpers/create-test-app.js'
import {
  mockResolve,
  mockResolveError,
} from '../../../../__tests__/helpers/mock-use-case.js'
import { approveAdminRoute } from '../approve-admin.js'

vi.mock('@repo/db', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@repo/db')>()
  return {
    ...mod,
    prisma: {
      user: { findUnique: vi.fn().mockResolvedValue(null) },
    },
  }
})

vi.mock('../../../../services/notification-enqueuer.js', () => ({
  enqueueNotification: vi.fn().mockResolvedValue(undefined),
}))

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(approveAdminRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockResolve(mockExecute)
})

const makeCommission = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'commission-id-001',
  organizationId: TEST_ORG_ID,
  policyId: 'policy-id-001',
  salespersonId: 'user-id-001',
  status: 'APPROVED',
  commissionValueInCents: 150000,
  premiumValueInCents: 1000000,
  percentageInBasisPoints: 1500,
  splitPercentage: null,
  approvedBy: TEST_USER_ID,
  approvedAt: new Date(),
  paidAt: null,
  rejectedBy: null,
  rejectedAt: null,
  rejectionReason: null,
  isReversal: false,
  originalCommissionId: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

describe('POST /api/v1/commissions/:id/approve-admin', () => {
  it('returns 200 with approved commission', async () => {
    mockExecute.mockResolvedValue(makeCommission())

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/commissions/commission-id-001/approve-admin',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.status).toBe('APPROVED')
    expect(body.data.approvedBy).toBe(TEST_USER_ID)
  })

  it('calls use case with correct id, organizationId and userId', async () => {
    mockExecute.mockResolvedValue(makeCommission())

    await app.inject({
      method: 'POST',
      url: '/api/v1/commissions/commission-id-001/approve-admin',
    })

    expect(mockExecute).toHaveBeenCalledWith(
      'commission-id-001',
      TEST_ORG_ID,
      TEST_USER_ID
    )
  })

  it('returns 422 when commission transition is invalid', async () => {
    mockResolveError(
      'INVALID_COMMISSION_TRANSITION',
      'Invalid commission transition'
    )

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/commissions/commission-id-001/approve-admin',
    })

    expect(response.statusCode).toBe(422)
    const body = response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('INVALID_COMMISSION_TRANSITION')
  })

  it('returns 404 when commission does not exist', async () => {
    mockResolveError('COMMISSION_NOT_FOUND', 'Commission not found')

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/commissions/nonexistent-id/approve-admin',
    })

    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.error.code).toBe('COMMISSION_NOT_FOUND')
  })

  it('sends notification when salesperson exists', async () => {
    const { prisma } = await import('@repo/db')
    const { enqueueNotification } =
      await import('../../../../services/notification-enqueuer.js')
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-id-001',
      name: 'João Silva',
      email: 'joao@example.com',
    } as never)
    mockExecute.mockResolvedValue(
      makeCommission({ salespersonId: 'user-id-001' })
    )

    await app.inject({
      method: 'POST',
      url: '/api/v1/commissions/commission-id-001/approve-admin',
    })

    expect(enqueueNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        notification: expect.objectContaining({
          type: 'COMMISSION_APPROVED',
          userId: 'user-id-001',
        }),
      })
    )
  })
})
