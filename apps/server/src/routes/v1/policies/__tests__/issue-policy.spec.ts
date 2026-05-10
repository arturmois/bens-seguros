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
import { issuePolicyRoute } from '../issue-policy.js'

vi.mock('@react-pdf/renderer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-pdf/renderer')>()
  return {
    ...actual,
    renderToBuffer: vi.fn().mockResolvedValue(Buffer.from('pdf')),
  }
})
vi.mock('@repo/db', () => {
  const mock = {
    organization: { findUnique: vi.fn().mockResolvedValue(null) },
  }
  return { prisma: mock, prismaAdmin: mock }
})
vi.mock('../../../pdf-templates/policy-summary-pdf.js', () => ({
  PolicySummaryPdf: vi.fn().mockReturnValue(null),
}))

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(issuePolicyRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockResolve(mockExecute)
})

const makePolicy = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'policy-id-001',
  organizationId: TEST_ORG_ID,
  proposalId: 'proposal-id-001',
  clientId: 'client-id-001',
  salespersonId: 'user-id-001',
  policyNumber: 'POL-2026-001',
  status: 'ACTIVE',
  branch: 'AUTO',
  premiumValueInCents: 150000,
  coverageDetails: null,
  startDate: new Date('2026-01-01'),
  endDate: new Date('2027-01-01'),
  cancelledAt: null,
  cancelReason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

describe('POST /api/v1/policies', () => {
  it('returns 201 with the issued policy', async () => {
    mockExecute.mockResolvedValue(makePolicy())
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/policies',
      payload: {
        proposalId: 'proposal-id-001',
        policyNumber: 'POL-2026-001',
        startDate: '2026-01-01',
        endDate: '2027-01-01',
        insurerId: 'insurer-id-001',
      },
    })
    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.policyNumber).toBe('POL-2026-001')
    expect(body.data.status).toBe('ACTIVE')
  })
  it('calls use case with organizationId from request context', async () => {
    mockExecute.mockResolvedValue(makePolicy())
    await injectAs(app, {
      method: 'POST',
      url: '/api/v1/policies',
      payload: {
        proposalId: 'proposal-id-001',
        policyNumber: 'POL-2026-001',
        startDate: '2026-01-01',
        endDate: '2027-01-01',
      },
    })
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: TEST_ORG_ID })
    )
  })
  it('returns 422 when proposal is not issuable', async () => {
    mockResolveError('POLICY_NOT_ISSUABLE', 'Proposal cannot be issued')
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/policies',
      payload: {
        proposalId: 'proposal-id-001',
        policyNumber: 'POL-2026-001',
        startDate: '2026-01-01',
        endDate: '2027-01-01',
      },
    })
    expect(response.statusCode).toBe(422)
    const body = response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('POLICY_NOT_ISSUABLE')
  })
  it('returns 422 when insurer is missing', async () => {
    mockResolveError('POLICY_MISSING_INSURER', 'Insurer is required')
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/policies',
      payload: {
        proposalId: 'proposal-id-001',
        policyNumber: 'POL-2026-001',
        startDate: '2026-01-01',
        endDate: '2027-01-01',
      },
    })
    expect(response.statusCode).toBe(422)
    const body = response.json()
    expect(body.error.code).toBe('POLICY_MISSING_INSURER')
  })
  it('returns 409 on duplicate policy number', async () => {
    mockResolveError('DUPLICATE_POLICY', 'Policy already exists')
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/policies',
      payload: {
        proposalId: 'proposal-id-001',
        policyNumber: 'POL-2026-001',
        startDate: '2026-01-01',
        endDate: '2027-01-01',
      },
    })
    expect(response.statusCode).toBe(409)
    const body = response.json()
    expect(body.error.code).toBe('DUPLICATE_POLICY')
  })
  it('returns 400 when endDate is before startDate', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/policies',
      payload: {
        proposalId: 'proposal-id-001',
        policyNumber: 'POL-2026-001',
        startDate: '2027-01-01',
        endDate: '2026-01-01',
      },
    })
    expect(response.statusCode).toBe(400)
  })
})
