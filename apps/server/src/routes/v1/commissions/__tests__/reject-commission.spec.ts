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
import { makeMinimalUser } from '../../../../__tests__/helpers/factories.js'
import {
  mockResolve,
  mockResolveError,
} from '../../../../__tests__/helpers/mock-use-case.js'
import { rejectCommissionRoute } from '../reject-commission.js'

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
  app = await createTestApp(rejectCommissionRoute)
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
  status: 'REJECTED',
  commissionValueInCents: 150000,
  premiumValueInCents: 1000000,
  percentageInBasisPoints: 1500,
  splitPercentage: null,
  approvedBy: null,
  approvedAt: null,
  paidAt: null,
  rejectedBy: TEST_USER_ID,
  rejectedAt: new Date(),
  rejectionReason: 'Documentação incompleta',
  isReversal: false,
  originalCommissionId: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

describe('POST /api/v1/commissions/:id/reject', () => {
  it('returns 200 with rejected commission', async () => {
    mockExecute.mockResolvedValue(makeCommission())

    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/commissions/commission-id-001/reject',
      payload: { reason: 'Documentação incompleta' },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.status).toBe('REJECTED')
    expect(body.data.rejectionReason).toBe('Documentação incompleta')
  })

  it('calls use case with correct params including reason', async () => {
    mockExecute.mockResolvedValue(makeCommission())

    await injectAs(app, {
      method: 'POST',
      url: '/api/v1/commissions/commission-id-001/reject',
      payload: { reason: 'Valor incorreto' },
    })

    expect(mockExecute).toHaveBeenCalledWith({
      id: 'commission-id-001',
      organizationId: TEST_ORG_ID,
      userId: TEST_USER_ID,
      reason: 'Valor incorreto',
    })
  })

  it('returns 422 when commission transition is invalid', async () => {
    mockResolveError(
      'INVALID_COMMISSION_TRANSITION',
      'Invalid commission transition'
    )

    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/commissions/commission-id-001/reject',
      payload: { reason: 'Motivo qualquer' },
    })

    expect(response.statusCode).toBe(422)
    const body = response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('INVALID_COMMISSION_TRANSITION')
  })

  it('returns 400 when reason is empty', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/commissions/commission-id-001/reject',
      payload: { reason: '' },
    })

    expect(response.statusCode).toBe(400)
  })

  it('sends notification when salesperson exists', async () => {
    const { prisma } = await import('@repo/db')
    const { enqueueNotification } =
      await import('../../../../services/notification-enqueuer.js')
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      makeMinimalUser({
        id: 'user-id-001',
        name: 'João Silva',
        email: 'joao@example.com',
      }) as unknown as Awaited<ReturnType<typeof prisma.user.findUnique>>
    )
    mockExecute.mockResolvedValue(
      makeCommission({ salespersonId: 'user-id-001' })
    )

    await injectAs(app, {
      method: 'POST',
      url: '/api/v1/commissions/commission-id-001/reject',
      payload: { reason: 'Documentação incompleta' },
    })

    expect(enqueueNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        notification: expect.objectContaining({
          type: 'COMMISSION_REJECTED',
          userId: 'user-id-001',
        }),
      })
    )
  })
})
