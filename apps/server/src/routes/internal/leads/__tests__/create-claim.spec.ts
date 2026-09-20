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
import { createInternalClaimRoute } from '../create-claim.js'

const mockExecute = vi.fn()

let app: Awaited<ReturnType<typeof createTestApp>>

const makeBody = (overrides: Partial<Record<string, unknown>> = {}) => ({
  phoneOrDocument: '11999999999',
  description: 'Colisão traseira',
  ...overrides,
})

beforeAll(async () => {
  app = await createTestApp((fastify) =>
    createInternalClaimRoute(fastify, {
      registerClaimFromChatFor: () => ({ execute: mockExecute }),
    })
  )
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockExecute.mockResolvedValue({
    claimCreated: true,
    claimNumber: 'SIN-42',
    dataSaved: false,
    claimData: null,
    message: 'Sinistro 42 registrado com prioridade urgente.',
  })
})

describe('POST /api/internal/claims', () => {
  it('creates a claim and returns claimNumber when client and policy exist', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/internal/claims',
      payload: makeBody(),
    })
    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.claimCreated).toBe(true)
    expect(body.data.claimNumber).toBe('SIN-42')
    expect(mockExecute).toHaveBeenCalledOnce()
  })
  it('returns dataSaved=true without creating claim when client is not found', async () => {
    mockExecute.mockResolvedValue({
      claimCreated: false,
      claimNumber: null,
      dataSaved: true,
      claimData: { phoneOrDocument: '11000000000' },
      message: 'Cliente não encontrado. Dados registrados para o corretor.',
    })
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/internal/claims',
      payload: makeBody({ phoneOrDocument: '11000000000' }),
    })
    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body.data.claimCreated).toBe(false)
    expect(body.data.dataSaved).toBe(true)
    expect(body.data.claimData).toBeDefined()
    expect(mockExecute).toHaveBeenCalledOnce()
  })
  it('returns dataSaved=true without creating claim when no active policy is found', async () => {
    mockExecute.mockResolvedValue({
      claimCreated: false,
      claimNumber: null,
      dataSaved: true,
      claimData: { clientId: 'client-001' },
      message:
        'Nenhuma apólice ativa encontrada. Dados registrados para o corretor.',
    })
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/internal/claims',
      payload: makeBody(),
    })
    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body.data.claimCreated).toBe(false)
    expect(body.data.dataSaved).toBe(true)
    expect(mockExecute).toHaveBeenCalledOnce()
  })
  it('returns 400 when required fields are missing', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/internal/claims',
      payload: { phoneOrDocument: '11999999999' },
    })
    expect(response.statusCode).toBe(400)
  })
  it('accepts optional incidentDate and incidentLocation', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/internal/claims',
      payload: makeBody({
        incidentDate: '2025-06-01',
        incidentLocation: 'Av. Paulista, 1000',
        insuranceType: 'AUTO',
      }),
    })
    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body.data.claimCreated).toBe(true)
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: TEST_ORG_ID,
        incidentLocation: 'Av. Paulista, 1000',
        incidentDate: '2025-06-01',
        insuranceType: 'AUTO',
      })
    )
  })
})
