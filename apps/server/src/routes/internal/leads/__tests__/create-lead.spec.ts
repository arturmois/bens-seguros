import { container } from '@repo/core'
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import {
  createTestApp,
  injectAs,
  setTestContext,
  TEST_ORG_ID,
} from '../../../../__tests__/helpers/create-test-app.js'
import { createLeadRoute } from '../create-lead.js'

const mockTenantPrisma = {
  contact: {
    findFirst: vi.fn(),
  },
  member: {
    findFirst: vi.fn(),
  },
}

vi.mock('@repo/db/tenant', () => ({
  createTenantClient: vi.fn(() => mockTenantPrisma),
}))

const mockCreateContactExecute = vi.fn()
const mockCreateProposalExecute = vi.fn()

let app: Awaited<ReturnType<typeof createTestApp>>

const makeMember = () => ({
  id: 'member-001',
  userId: 'user-001',
  organizationId: TEST_ORG_ID,
  active: true,
  createdAt: new Date(),
})

const makeContact = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'contact-001',
  organizationId: TEST_ORG_ID,
  name: 'João Silva',
  phone: '11999999999',
  deletedAt: null,
  ...overrides,
})

const makeProposal = () => ({
  id: 'proposal-001',
  organizationId: TEST_ORG_ID,
  contactId: 'contact-001',
})

beforeAll(async () => {
  app = await createTestApp(createLeadRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockTenantPrisma.contact.findFirst.mockResolvedValue(null)
  mockTenantPrisma.member.findFirst.mockResolvedValue(makeMember())
  mockCreateContactExecute.mockResolvedValue(makeContact())
  mockCreateProposalExecute.mockResolvedValue(makeProposal())

  // Token-based dispatch keeps tests independent of call order.
  vi.mocked(container.resolve).mockImplementation((token: unknown) => {
    if (typeof token !== 'function') return null
    const name = (token as { name?: string }).name ?? ''
    if (name === 'CreateContact') {
      return { execute: mockCreateContactExecute }
    }
    if (name === 'CreateProposal') {
      return { execute: mockCreateProposalExecute }
    }
    return { execute: vi.fn() }
  })
})

describe('POST /api/internal/leads', () => {
  it('creates a new contact and proposal when contact does not exist', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/internal/leads',
      payload: {
        clientName: 'João Silva',
        clientPhone: '11999999999',
        insuranceType: 'AUTO',
      },
    })

    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.proposalId).toBe('proposal-001')
    expect(body.data.contactId).toBe('contact-001')
    expect(mockCreateContactExecute).toHaveBeenCalledOnce()
  })

  it('reuses existing contact when phone already exists', async () => {
    mockTenantPrisma.contact.findFirst.mockResolvedValue(makeContact())

    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/internal/leads',
      payload: {
        clientName: 'João Silva',
        clientPhone: '11999999999',
        insuranceType: 'VIDA',
      },
    })

    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(mockCreateContactExecute).not.toHaveBeenCalled()
  })

  it('ignores body.source for existing contacts to preserve original channel attribution', async () => {
    mockTenantPrisma.contact.findFirst.mockResolvedValue(
      makeContact({ source: 'CHAT_WHATSAPP' })
    )

    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/internal/leads',
      payload: {
        clientName: 'João Silva',
        clientPhone: '11999999999',
        insuranceType: 'AUTO',
        source: 'CHAT_WIDGET',
      },
    })

    expect(response.statusCode).toBe(201)
    expect(mockCreateContactExecute).not.toHaveBeenCalled()
  })

  it('returns 400 when no active member exists in org', async () => {
    mockTenantPrisma.member.findFirst.mockResolvedValue(null)

    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/internal/leads',
      payload: {
        clientName: 'João Silva',
        clientPhone: '11999999999',
        insuranceType: 'AUTO',
      },
    })

    expect(response.statusCode).toBe(400)
    const body = response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('NO_MEMBER')
  })

  it('returns 400 when required fields are missing', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/internal/leads',
      payload: { clientPhone: '11999999999' },
    })

    expect(response.statusCode).toBeGreaterThanOrEqual(400)
  })

  it('maps insurance type to branch correctly and calls CreateProposal use case', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/internal/leads',
      payload: {
        clientName: 'Maria Souza',
        clientPhone: '11988888888',
        insuranceType: 'RESIDENCIAL',
      },
    })

    expect(response.statusCode).toBe(201)
    expect(mockCreateProposalExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        branch: 'RESIDENTIAL',
        organizationId: TEST_ORG_ID,
      })
    )
  })

  it('persists Contact.source as CHAT_WIDGET when body.source = CHAT_WIDGET', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/internal/leads',
      payload: {
        clientName: 'João Silva',
        clientPhone: '11999999999',
        insuranceType: 'AUTO',
        source: 'CHAT_WIDGET',
      },
    })

    expect(response.statusCode).toBe(201)
    expect(mockCreateContactExecute).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'CHAT_WIDGET' })
    )
  })

  it('persists Contact.source as CHAT_WHATSAPP when body.source = CHAT_WHATSAPP', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/internal/leads',
      payload: {
        clientName: 'João Silva',
        clientPhone: '11999999999',
        insuranceType: 'AUTO',
        source: 'CHAT_WHATSAPP',
      },
    })

    expect(response.statusCode).toBe(201)
    expect(mockCreateContactExecute).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'CHAT_WHATSAPP' })
    )
  })

  it('falls back to MANUAL when body.source is omitted', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/internal/leads',
      payload: {
        clientName: 'João Silva',
        clientPhone: '11999999999',
        insuranceType: 'AUTO',
      },
    })

    expect(response.statusCode).toBe(201)
    expect(mockCreateContactExecute).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'MANUAL' })
    )
  })

  it('rejects unknown source values with 400', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/internal/leads',
      payload: {
        clientName: 'João Silva',
        clientPhone: '11999999999',
        insuranceType: 'AUTO',
        source: 'WHATSAPP_BOT',
      },
    })

    expect(response.statusCode).toBe(400)
    const body = response.json()
    expect(body.success).toBe(false)
    // Schema rejection — must NOT be the NO_MEMBER path
    expect(body.error.code).toBe('VALIDATION_ERROR')
    expect(body.error.code).not.toBe('NO_MEMBER')
    // The validation error must reference the 'source' field
    expect(JSON.stringify(body.error)).toMatch(/source/i)
    expect(mockCreateContactExecute).not.toHaveBeenCalled()
  })
})
