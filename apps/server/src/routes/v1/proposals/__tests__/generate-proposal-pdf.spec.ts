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
import { generateProposalPdfRoute } from '../generate-proposal-pdf.js'

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
  }
  return { prisma: mock, prismaAdmin: mock }
})

vi.mock('../../../pdf-templates/proposal-quote-pdf.js', () => ({
  ProposalQuotePdf: vi.fn().mockReturnValue(null),
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

const makeProposal = () => {
  const base = {
    id: 'p-001',
    organizationId: TEST_ORG_ID,
    clientId: 'c-001',
    salespersonId: 'user-001',
    stage: 'QUOTE',
    boardType: 'NEW_INSURANCE',
    branch: 'AUTO',
    premiumValueInCents: 150000,
    commissionPercentageInCents: 1000,
    details: null,
    lostReason: null,
    observations: null,
    renewalPolicyId: null,
    renewalPolicyNumber: null,
    sourcePolicyId: null,
    endorsementType: null,
    endorsementReason: null,
    sourcePolicySnapshot: null,
    insurerId: null,
    deletedAt: null,
    coverageStartDate: null,
    coverageEndDate: null,
    sentToClientAt: null,
    clientResponseAt: null,
    quoteValidUntil: null,
    createdAt: new Date('2025-01-01').toISOString(),
    updatedAt: new Date('2025-01-01').toISOString(),
  }
  return { ...base, toJSON: () => base }
}

beforeAll(async () => {
  app = await createTestApp(generateProposalPdfRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockDocumentRepo.findByEntity.mockResolvedValue([])
  mockDocumentRepo.upsertByStorageKey.mockResolvedValue(undefined)
  mockStorage.getSignedUrl.mockResolvedValue(
    'https://cdn.example.com/cotacao.pdf'
  )
  mockStorage.upload.mockResolvedValue(undefined)
  vi.mocked(container.resolve).mockImplementation((token: unknown) => {
    if (token === 'DocumentRepository') return mockDocumentRepo
    if (token === 'StorageProvider') return mockStorage
    if (typeof token === 'function') {
      return { execute: vi.fn().mockResolvedValue(makeProposal()) }
    }
    return null
  })
})

describe('POST /api/v1/proposals/:id/pdf', () => {
  it('returns 200 with url and cached=false when generating new PDF', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/proposals/p-001/pdf',
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.url).toBe('https://cdn.example.com/cotacao.pdf')
    expect(body.data.cached).toBe(false)
  })
  it('returns cached=true when PDF already exists and force is not set', async () => {
    mockDocumentRepo.findByEntity.mockResolvedValue([
      {
        id: 'doc-001',
        type: 'QUOTATION_PDF',
        storageKey: `organizations/${TEST_ORG_ID}/proposals/p-001/cotacao.pdf`,
      },
    ])
    mockStorage.getSignedUrl.mockResolvedValue(
      'https://cdn.example.com/cached.pdf'
    )
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/proposals/p-001/pdf',
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.data.cached).toBe(true)
    expect(body.data.url).toBe('https://cdn.example.com/cached.pdf')
  })
  it('regenerates PDF when force=true even if cached version exists', async () => {
    mockDocumentRepo.findByEntity.mockResolvedValue([
      {
        id: 'doc-001',
        type: 'QUOTATION_PDF',
        storageKey: `organizations/${TEST_ORG_ID}/proposals/p-001/cotacao.pdf`,
      },
    ])
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/proposals/p-001/pdf',
      query: { force: 'true' },
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.data.cached).toBe(false)
  })
  it('returns 404 when proposal does not exist', async () => {
    const error = Object.assign(new Error('Proposal not found'), {
      code: 'PROPOSAL_NOT_FOUND',
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
      url: '/api/v1/proposals/nonexistent/pdf',
    })
    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.error.code).toBe('PROPOSAL_NOT_FOUND')
  })
  it('returns 404 when organization does not exist', async () => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValue(null)
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/proposals/p-001/pdf',
    })
    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.error.code).toBe('ORGANIZATION_NOT_FOUND')
  })
})
