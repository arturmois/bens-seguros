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
  injectAs,
  setTestContext,
  TEST_ORG_ID,
} from '../../../../__tests__/helpers/create-test-app.js'
import { createLeadRoute } from '../create-lead.js'

const mockTenantPrisma = {
  client: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  member: {
    findFirst: vi.fn(),
  },
}

vi.mock('@repo/db/tenant', () => ({
  createTenantClient: vi.fn(() => mockTenantPrisma),
}))

const mockExecute = vi.fn()

let app: Awaited<ReturnType<typeof createTestApp>>

const makeMember = () => ({
  id: 'member-001',
  userId: 'user-001',
  organizationId: TEST_ORG_ID,
  active: true,
  createdAt: new Date(),
})

const makeClient = () => ({
  id: 'client-001',
  organizationId: TEST_ORG_ID,
  name: 'João Silva',
  phone: '11999999999',
  type: 'LEAD',
  document: '',
  deletedAt: null,
})

const makeProposal = () => ({
  id: 'proposal-001',
  organizationId: TEST_ORG_ID,
  clientId: 'client-001',
})

beforeAll(async () => {
  app = await createTestApp(createLeadRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockTenantPrisma.client.findFirst.mockResolvedValue(null)
  mockTenantPrisma.client.create.mockResolvedValue(makeClient())
  mockTenantPrisma.member.findFirst.mockResolvedValue(makeMember())
  mockExecute.mockResolvedValue(makeProposal())
  vi.mocked(container.resolve).mockImplementation((token: unknown) => {
    if (typeof token === 'function') return { execute: mockExecute }
    return null
  })
})

describe('POST /api/internal/leads', () => {
  it('creates a new client and proposal when client does not exist', async () => {
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
    expect(body.data.clientId).toBe('client-001')
    expect(mockTenantPrisma.client.create).toHaveBeenCalledOnce()
  })

  it('reuses existing client when phone already exists', async () => {
    const existingClient = makeClient()
    mockTenantPrisma.client.findFirst.mockResolvedValue(existingClient)

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
    expect(mockTenantPrisma.client.create).not.toHaveBeenCalled()
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
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        branch: 'RESIDENTIAL',
        organizationId: TEST_ORG_ID,
      })
    )
  })
})
