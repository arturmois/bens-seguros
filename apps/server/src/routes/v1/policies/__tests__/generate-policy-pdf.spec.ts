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
import { generatePolicyPdfRoute } from '../generate-policy-pdf.js'

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
      }),
    },
    client: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    contact: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    proposal: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
  }
  return { prisma: mock, prismaAdmin: mock }
})

vi.mock('@repo/shared', () => ({
  decrypt: vi.fn().mockReturnValue('12345678901'),
  getEncryptionKey: vi.fn().mockReturnValue(Buffer.alloc(32)),
}))

vi.mock('../../../pdf-templates/policy-summary-pdf.js', () => ({
  PolicySummaryPdf: vi.fn().mockReturnValue(null),
}))

import { prisma } from '@repo/db'

let app: Awaited<ReturnType<typeof createTestApp>>

const mockDocumentRepo = {
  findByEntity: vi.fn(),
  upsertByStorageKey: vi.fn(),
}

const mockStorage = {
  getSignedUrl: vi.fn(),
  upload: vi.fn(),
}

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
  clientDocument: '12345678901',
  ...overrides,
})

beforeAll(async () => {
  app = await createTestApp(generatePolicyPdfRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockDocumentRepo.findByEntity.mockResolvedValue([])
  mockDocumentRepo.upsertByStorageKey.mockResolvedValue(undefined)
  mockStorage.getSignedUrl.mockResolvedValue(
    'https://cdn.example.com/apolice.pdf'
  )
  mockStorage.upload.mockResolvedValue(undefined)
  vi.mocked(container.resolve).mockImplementation((token: unknown) => {
    if (token === 'DocumentRepository') return mockDocumentRepo
    if (token === 'StorageProvider') return mockStorage
    if (typeof token === 'function') {
      return { execute: vi.fn().mockResolvedValue(makePolicy()) }
    }
    return null
  })
})

describe('POST /api/v1/policies/:id/pdf', () => {
  it('returns 200 with url and cached=false when generating new PDF', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/policies/policy-id-001/pdf',
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.url).toBe('https://cdn.example.com/apolice.pdf')
    expect(body.data.cached).toBe(false)
  })
  it('returns cached=true when PDF already exists and force is not set', async () => {
    mockDocumentRepo.findByEntity.mockResolvedValue([
      {
        id: 'doc-id-001',
        type: 'POLICY_PDF',
        storageKey: 'organizations/org/policies/policy-id-001/apolice.pdf',
      },
    ])
    mockStorage.getSignedUrl.mockResolvedValue(
      'https://cdn.example.com/cached.pdf'
    )
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/policies/policy-id-001/pdf',
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.cached).toBe(true)
    expect(body.data.url).toBe('https://cdn.example.com/cached.pdf')
  })
  it('regenerates PDF when force=true even if cached version exists', async () => {
    mockDocumentRepo.findByEntity.mockResolvedValue([
      {
        id: 'doc-id-001',
        type: 'POLICY_PDF',
        storageKey: 'organizations/org/policies/policy-id-001/apolice.pdf',
      },
    ])
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/policies/policy-id-001/pdf',
      query: { force: 'true' },
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.cached).toBe(false)
  })
  it('returns 404 when policy is not found', async () => {
    const error = Object.assign(new Error('Policy not found'), {
      code: 'POLICY_NOT_FOUND',
    })
    vi.mocked(container.resolve).mockImplementation((token: unknown) => {
      if (token === 'DocumentRepository') return mockDocumentRepo
      if (token === 'StorageProvider') return mockStorage
      if (typeof token === 'function') {
        return { execute: vi.fn().mockRejectedValue(error) }
      }
      return null
    })
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/policies/nonexistent-id/pdf',
    })
    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('POLICY_NOT_FOUND')
  })
  it('returns 404 when organization is not found', async () => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValue(null)
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/policies/policy-id-001/pdf',
    })
    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('ORGANIZATION_NOT_FOUND')
  })
})
