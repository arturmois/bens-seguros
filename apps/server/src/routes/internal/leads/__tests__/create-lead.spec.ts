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

const mockCaptureLeadExecute = vi.fn()

let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp((fastify) =>
    createLeadRoute(fastify, {
      captureLeadFor: () => ({ execute: mockCaptureLeadExecute }),
    })
  )
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockCaptureLeadExecute.mockResolvedValue({
    proposalId: 'proposal-001',
    contactId: 'contact-001',
    message: 'Lead registrado: João Silva - AUTO',
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
    expect(body.data.message).toBe('Lead registrado: João Silva - AUTO')
  })

  it('returns 400 NO_MEMBER No active member in org', async () => {
    const error = new Error('No active member in org')
    Object.assign(error, { code: 'NO_MEMBER' })
    mockCaptureLeadExecute.mockRejectedValue(error)
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
    expect(body.error.message).toBe('No active member in org')
  })

  it('returns 400 when required fields are missing', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/internal/leads',
      payload: { clientPhone: '11999999999' },
    })
    expect(response.statusCode).toBeGreaterThanOrEqual(400)
  })

  it('passes body fields to CaptureLead including source', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/internal/leads',
      payload: {
        clientName: 'João Silva',
        clientPhone: '11999999999',
        insuranceType: 'AUTO',
        source: 'CHAT_WIDGET',
        notes: 'detalhes',
      },
    })
    expect(response.statusCode).toBe(201)
    expect(mockCaptureLeadExecute).toHaveBeenCalledWith({
      organizationId: TEST_ORG_ID,
      clientName: 'João Silva',
      clientPhone: '11999999999',
      insuranceType: 'AUTO',
      source: 'CHAT_WIDGET',
      notes: 'detalhes',
    })
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
    expect(body.error.code).toBe('VALIDATION_ERROR')
    expect(body.error.code).not.toBe('NO_MEMBER')
    expect(JSON.stringify(body.error)).toMatch(/source/i)
    expect(mockCaptureLeadExecute).not.toHaveBeenCalled()
  })
})
