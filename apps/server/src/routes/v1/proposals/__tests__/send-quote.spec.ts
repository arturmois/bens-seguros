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
  TEST_USER_ID,
} from '../../../../__tests__/helpers/create-test-app.js'
import { makeOrganization } from '../../../../__tests__/helpers/factories.js'
import { sendQuoteRoute } from '../send-quote.js'

vi.mock('@react-pdf/renderer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-pdf/renderer')>()
  return {
    ...actual,
    renderToBuffer: vi.fn().mockResolvedValue(Buffer.from('pdf-content')),
  }
})

vi.mock('@repo/db', () => {
  const mock = {
    contact: {
      findFirst: vi.fn().mockResolvedValue({
        email: 'cliente@example.com',
        name: 'João Silva',
      }),
    },
    organization: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'org-test-00000000-0000-0000-0000-000000000001',
        name: 'Corretora Exemplo',
        logo: null,
      }),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue({
        name: 'Vendedor Teste',
        email: 'vendedor@example.com',
      }),
    },
  }
  return { prisma: mock, prismaAdmin: mock }
})

vi.mock('../../../pdf-templates/proposal-quote-pdf.js', () => ({
  ProposalQuotePdf: vi.fn().mockReturnValue(null),
}))

vi.mock('../../../services/send-quote-enqueuer.js', () => ({
  enqueueSendQuoteEmail: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}))

import { prisma } from '@repo/db'

let app: Awaited<ReturnType<typeof createTestApp>>

const mockStorage = {
  getSignedUrl: vi
    .fn()
    .mockResolvedValue('https://cdn.example.com/cotacao.pdf'),
  upload: vi.fn().mockResolvedValue(undefined),
}

const mockDocumentRepo = {
  upsertByStorageKey: vi.fn().mockResolvedValue(undefined),
}

const makeProposal = () => {
  const base = {
    id: 'p-001',
    organizationId: TEST_ORG_ID,
    contactId: 'contact-001',
    salespersonId: TEST_USER_ID,
    stage: 'QUOTE',
    boardType: 'NEW_INSURANCE',
    branch: 'AUTO',
    premiumValueInCents: 150000,
    commissionPercentageInCents: 1000,
    details: null,
    lostReason: null,
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
  app = await createTestApp(sendQuoteRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockStorage.upload.mockResolvedValue(undefined)
  mockStorage.getSignedUrl.mockResolvedValue(
    'https://cdn.example.com/cotacao.pdf'
  )
  mockDocumentRepo.upsertByStorageKey.mockResolvedValue(undefined)
  vi.mocked(prisma.contact.findFirst).mockResolvedValue({
    email: 'cliente@example.com',
    name: 'João Silva',
  } as unknown as Awaited<ReturnType<typeof prisma.contact.findFirst>>)
  vi.mocked(prisma.organization.findUnique).mockResolvedValue(
    makeOrganization() as unknown as Awaited<
      ReturnType<typeof prisma.organization.findUnique>
    >
  )
  let callCount = 0
  vi.mocked(container.resolve).mockImplementation((token: unknown) => {
    if (token === 'StorageProvider') return mockStorage
    if (token === 'DocumentRepository') return mockDocumentRepo
    if (typeof token === 'function') {
      callCount++
      if (callCount === 1) {
        return { execute: vi.fn().mockResolvedValue(makeProposal()) }
      }
      return { validate: vi.fn().mockResolvedValue(undefined) }
    }
    return null
  })
})

describe('POST /api/v1/proposals/:id/send-quote', () => {
  it('returns 202 with success message', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/proposals/p-001/send-quote',
    })
    expect(response.statusCode).toBe(202)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.message).toBeDefined()
  })
  it('returns 404 when proposal does not exist', async () => {
    const error = Object.assign(new Error('Proposal not found'), {
      code: 'PROPOSAL_NOT_FOUND',
    })
    vi.mocked(container.resolve).mockImplementation((token: unknown) => {
      if (token === 'StorageProvider') return mockStorage
      if (token === 'DocumentRepository') return mockDocumentRepo
      if (typeof token === 'function') {
        return { execute: vi.fn().mockRejectedValue(error) }
      }
      return null
    })
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/proposals/nonexistent/send-quote',
    })
    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.error.code).toBe('PROPOSAL_NOT_FOUND')
  })
  it('returns 422 when client has no email', async () => {
    const error = Object.assign(new Error('Client has no email'), {
      code: 'CLIENT_NO_EMAIL',
    })
    let callCount = 0
    vi.mocked(container.resolve).mockImplementation((token: unknown) => {
      if (token === 'StorageProvider') return mockStorage
      if (token === 'DocumentRepository') return mockDocumentRepo
      if (typeof token === 'function') {
        callCount++
        if (callCount === 1) {
          return { execute: vi.fn().mockResolvedValue(makeProposal()) }
        }
        return { validate: vi.fn().mockRejectedValue(error) }
      }
      return null
    })
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/proposals/p-001/send-quote',
    })
    expect(response.statusCode).toBe(422)
    const body = response.json()
    expect(body.error.code).toBe('CLIENT_NO_EMAIL')
  })
  it('returns 404 when organization does not exist', async () => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValue(null)
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/proposals/p-001/send-quote',
    })
    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.error.code).toBe('ORGANIZATION_NOT_FOUND')
  })
})
