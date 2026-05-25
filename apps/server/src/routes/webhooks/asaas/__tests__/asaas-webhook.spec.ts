import Fastify, { type FastifyInstance } from 'fastify'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  BillingProviderAuthError,
  BillingProviderInvalidRequestError,
  type CanonicalEvent,
} from '@repo/billing-port'
import { Prisma } from '@repo/db'
import { asaasWebhookRoute } from '../index.js'

const mockProvider = {
  validateAndParseWebhook:
    vi.fn<(body: string, headers: Record<string, string>) => CanonicalEvent>(),
}

const mockPrismaAdmin = {
  webhookEvent: {
    create: vi.fn(),
  },
}

vi.mock('@repo/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@repo/db')>()
  return {
    ...actual,
    prismaAdmin: {
      get webhookEvent() {
        return mockPrismaAdmin.webhookEvent
      },
    },
  }
})

async function buildTestApp(
  provider: typeof mockProvider | null
): Promise<FastifyInstance> {
  const app = Fastify({ logger: false })
  await app.register(async (instance) => {
    asaasWebhookRoute(instance, provider)
  })
  return app
}

const validCanonicalEvent: CanonicalEvent = {
  type: 'PAYMENT_SUCCEEDED',
  provider: 'asaas',
  externalId: 'evt_001',
  occurredAt: new Date('2026-05-25T10:00:00.000Z'),
  providerCustomerId: 'cus_001',
  providerSubscriptionId: 'sub_001',
  providerPaymentId: 'pay_001',
  amountCents: 29900,
  currency: 'BRL',
}

describe('POST /api/webhooks/asaas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('200 OK + insere WebhookEvent quando token + payload válidos', async () => {
    mockProvider.validateAndParseWebhook.mockReturnValue(validCanonicalEvent)
    mockPrismaAdmin.webhookEvent.create.mockResolvedValue({
      id: 'wh_xxx',
      source: 'asaas',
      externalId: 'evt_001',
    })

    const app = await buildTestApp(mockProvider)
    const res = await app.inject({
      method: 'POST',
      url: '/api/webhooks/asaas',
      headers: { 'asaas-access-token': 'super-secret' },
      payload: { id: 'evt_001', event: 'PAYMENT_RECEIVED' },
    })

    expect(res.statusCode).toBe(200)
    expect(mockPrismaAdmin.webhookEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        source: 'asaas',
        externalId: 'evt_001',
        eventType: 'PAYMENT_SUCCEEDED',
        signatureValid: true,
        payload: expect.objectContaining({
          type: 'PAYMENT_SUCCEEDED',
          providerCustomerId: 'cus_001',
        }),
      }),
    })
    await app.close()
  })

  it('200 OK em dedup hit (P2002 unique violation)', async () => {
    mockProvider.validateAndParseWebhook.mockReturnValue(validCanonicalEvent)
    const p2002 = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      {
        code: 'P2002',
        clientVersion: '7.5.0',
        meta: { target: ['source', 'externalId'] },
      }
    )
    mockPrismaAdmin.webhookEvent.create.mockRejectedValue(p2002)

    const app = await buildTestApp(mockProvider)
    const res = await app.inject({
      method: 'POST',
      url: '/api/webhooks/asaas',
      headers: { 'asaas-access-token': 'super-secret' },
      payload: { id: 'evt_001', event: 'PAYMENT_RECEIVED' },
    })

    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.payload)).toMatchObject({ deduped: true })
    await app.close()
  })

  it('401 Unauthorized em BillingProviderAuthError', async () => {
    mockProvider.validateAndParseWebhook.mockImplementation(() => {
      throw new BillingProviderAuthError('asaas', 'token mismatch')
    })

    const app = await buildTestApp(mockProvider)
    const res = await app.inject({
      method: 'POST',
      url: '/api/webhooks/asaas',
      headers: { 'asaas-access-token': 'wrong' },
      payload: { id: 'x', event: 'PAYMENT_RECEIVED' },
    })

    expect(res.statusCode).toBe(401)
    expect(mockPrismaAdmin.webhookEvent.create).not.toHaveBeenCalled()
    await app.close()
  })

  it('400 Bad Request em BillingProviderInvalidRequestError', async () => {
    mockProvider.validateAndParseWebhook.mockImplementation(() => {
      throw new BillingProviderInvalidRequestError('asaas', 'unsupported event')
    })

    const app = await buildTestApp(mockProvider)
    const res = await app.inject({
      method: 'POST',
      url: '/api/webhooks/asaas',
      headers: { 'asaas-access-token': 'super-secret' },
      payload: { id: 'x', event: 'TRANSFER_CREATED' },
    })

    expect(res.statusCode).toBe(400)
    expect(mockPrismaAdmin.webhookEvent.create).not.toHaveBeenCalled()
    await app.close()
  })

  it('503 quando provider ausente (sem creds)', async () => {
    const app = await buildTestApp(null)
    const res = await app.inject({
      method: 'POST',
      url: '/api/webhooks/asaas',
      headers: { 'asaas-access-token': 'x' },
      payload: { id: 'x', event: 'PAYMENT_RECEIVED' },
    })

    expect(res.statusCode).toBe(503)
    await app.close()
  })
})
