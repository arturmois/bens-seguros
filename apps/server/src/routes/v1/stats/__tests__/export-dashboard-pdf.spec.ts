import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
} from 'vitest'
import { container } from '@repo/core'
import {
  createTestApp,
  setTestContext,
  TEST_ORG_ID,
} from '../../../../__tests__/helpers/create-test-app.js'
import { exportDashboardPdfRoute } from '../export-dashboard-pdf.js'

vi.mock('@react-pdf/renderer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-pdf/renderer')>()
  return {
    ...actual,
    renderToBuffer: vi.fn().mockResolvedValue(Buffer.from('pdf-content')),
  }
})

vi.mock('@repo/db', () => {
  const mock = {
    organization: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'org-test-00000000-0000-0000-0000-000000000001',
        name: 'Corretora Exemplo',
        logo: null,
        slug: 'corretora-exemplo',
        active: true,
        metadata: {},
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      }),
    },
  }
  return { prisma: mock, prismaAdmin: mock }
})

vi.mock('../stats-helpers.js', () => ({
  buildDashboardData: vi.fn(),
}))

vi.mock('../../../pdf-templates/dashboard-report-pdf.js', () => ({
  DashboardReportPdf: vi.fn().mockReturnValue(null),
}))

import { prisma } from '@repo/db'
import { buildDashboardData } from '../stats-helpers.js'

const makeDashboardData = () => ({
  proposalsByStage: [],
  activePolicies: 5,
  expiringPolicies: 1,
  renewalsNext7Days: 0,
  claimsByPriority: [],
  commissionsThisMonth: [],
  conversionRate: { total: 10, issued: 4, rate: 40 },
  monthlyTrends: [],
  comparison: {
    proposals: { current: 5, previous: 3, changePercent: 67 },
    policies: { current: 3, previous: 2, changePercent: 50 },
    claims: { current: 1, previous: 0, changePercent: 100 },
    commissionsPending: { current: 10000, previous: 8000, changePercent: 25 },
  },
  totalPremium: { current: 100000, previous: 80000, changePercent: 25 },
  averageTicket: { current: 33333, previous: 40000, changePercent: -17 },
  commissionsReceivable: 60000,
  ranking: [],
  newInsurance: { current: 0, previous: 0, changePercent: 0 },
  renewal7dPremiumCents: 0,
  warnings: { total: 0, claimsOpen: 0, assistancesOpen: 0 },
  proposalsPending: { total: 0, inDay: 0, warning: 0, critical: 0 },
})

const mockStorage = {
  getSignedUrl: vi.fn(),
  upload: vi.fn(),
}

const mockDocumentRepo = {
  upsertByStorageKey: vi.fn(),
}

let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(exportDashboardPdfRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  vi.mocked(buildDashboardData).mockResolvedValue(makeDashboardData())
  vi.mocked(prisma.organization.findUnique).mockResolvedValue({
    id: TEST_ORG_ID,
    name: 'Corretora Exemplo',
    logo: null,
    slug: 'corretora-exemplo',
    active: true,
    metadata: {},
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  })
  mockStorage.getSignedUrl.mockResolvedValue(
    'https://cdn.example.com/relatorio.pdf'
  )
  mockStorage.upload.mockResolvedValue(undefined)
  mockDocumentRepo.upsertByStorageKey.mockResolvedValue(undefined)
  vi.mocked(container.resolve).mockImplementation((token: unknown) => {
    if (token === 'StorageProvider') return mockStorage
    if (token === 'DocumentRepository') return mockDocumentRepo
    return null
  })
})

describe('POST /api/v1/stats/dashboard/pdf', () => {
  it('returns 200 with signed URL when PDF is generated successfully', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/stats/dashboard/pdf',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.url).toBe('https://cdn.example.com/relatorio.pdf')
  })

  it('uploads PDF to storage with correct key', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/v1/stats/dashboard/pdf',
    })

    expect(mockStorage.upload).toHaveBeenCalledWith(
      expect.stringContaining(`organizations/${TEST_ORG_ID}/reports/`),
      expect.any(Buffer),
      'application/pdf'
    )
  })

  it('returns 404 when organization does not exist', async () => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValue(null)

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/stats/dashboard/pdf',
    })

    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.error.code).toBe('ORGANIZATION_NOT_FOUND')
  })

  it('calls buildDashboardData with correct orgId and preset', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/v1/stats/dashboard/pdf',
      query: { preset: '7d' },
    })

    expect(vi.mocked(buildDashboardData)).toHaveBeenCalledWith(
      TEST_ORG_ID,
      '7d'
    )
  })

  it('saves document reference via DocumentRepository', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/v1/stats/dashboard/pdf',
    })

    expect(mockDocumentRepo.upsertByStorageKey).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: TEST_ORG_ID,
        mimeType: 'application/pdf',
        type: 'OTHER',
      })
    )
  })
})
