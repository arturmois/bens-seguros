import {
  BillingProviderAuthError,
  BillingProviderInvalidRequestError,
  BillingProviderUnhandledEventError,
  type CanonicalEvent,
} from '@repo/billing-port'
import { Prisma } from '@repo/db'
import Fastify, { type FastifyInstance } from 'fastify'
import type IORedis from 'ioredis'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { asaasWebhookRoute } from '../index.js'

const mockProvider = {
  validateAndParseWebhook:
    vi.fn<(body: string, headers: Record<string, string>) => CanonicalEvent>(),
}

const mockSubscription = {
  id: 'sub_db_001',
  organizationId: 'org_001',
  status: 'ACTIVE',
  currentPeriodStart: new Date('2026-05-01'),
  currentPeriodEnd: new Date('2026-06-01'),
  billingManagedExternally: false,
}

const mockPrismaAdmin = {
  webhookEvent: {
    create: vi.fn(),
    update: vi.fn(),
  },
  subscription: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  invoice: {
    upsert: vi.fn(),
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
      get subscription() {
        return mockPrismaAdmin.subscription
      },
      get invoice() {
        return mockPrismaAdmin.invoice
      },
    },
  }
})

const mockRedis = {
  publish: vi.fn().mockResolvedValue(0),
  del: vi.fn().mockResolvedValue(0),
} as unknown as IORedis

async function buildTestApp(
  provider: typeof mockProvider | null
): Promise<FastifyInstance> {
  const app = Fastify({ logger: false })
  await app.register(async (instance) => {
    asaasWebhookRoute(instance, provider, mockRedis)
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
    mockPrismaAdmin.webhookEvent.create.mockResolvedValue({ id: 'wh_xxx' })
    mockPrismaAdmin.webhookEvent.update.mockResolvedValue(undefined)
    mockPrismaAdmin.subscription.findUnique.mockResolvedValue(mockSubscription)
    mockPrismaAdmin.subscription.update.mockResolvedValue(undefined)
    mockPrismaAdmin.invoice.upsert.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('200 OK + insere WebhookEvent quando token + payload válidos', async () => {
    mockProvider.validateAndParseWebhook.mockReturnValue(validCanonicalEvent)

    const app = await buildTestApp(mockProvider)
    const res = await app.inject({
      method: 'POST',
      url: '/api/webhooks/asaas',
      headers: { 'asaas-access-token': 'super-secret' },
      payload: { id: 'evt_001', event: 'PAYMENT_RECEIVED' },
    })

    expect(res.statusCode).toBe(200)
    expect(mockPrismaAdmin.webhookEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          source: 'asaas',
          externalId: 'evt_001',
          eventType: 'PAYMENT_SUCCEEDED',
          signatureValid: true,
        }),
        select: { id: true },
      })
    )
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
    expect(mockPrismaAdmin.invoice.upsert).not.toHaveBeenCalled()
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

  it('200 OK + skipped em BillingProviderUnhandledEventError (avulsas)', async () => {
    mockProvider.validateAndParseWebhook.mockImplementation(() => {
      throw new BillingProviderUnhandledEventError(
        'asaas',
        'PAYMENT_RECEIVED event has no subscription reference',
        { reason: 'no_subscription' }
      )
    })

    const app = await buildTestApp(mockProvider)
    const res = await app.inject({
      method: 'POST',
      url: '/api/webhooks/asaas',
      headers: { 'asaas-access-token': 'super-secret' },
      payload: { id: 'x', event: 'PAYMENT_RECEIVED' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({
      success: true,
      data: { skipped: true, reason: 'no_subscription' },
    })
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

  it('processa CanonicalEvent + atualiza Subscription + Invoice + processedAt', async () => {
    mockProvider.validateAndParseWebhook.mockReturnValue(validCanonicalEvent)

    const app = await buildTestApp(mockProvider)
    const res = await app.inject({
      method: 'POST',
      url: '/api/webhooks/asaas',
      headers: { 'asaas-access-token': 'super-secret' },
      payload: { id: 'evt_001', event: 'PAYMENT_RECEIVED' },
    })

    expect(res.statusCode).toBe(200)
    expect(mockPrismaAdmin.subscription.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { billingProviderCustomerId: 'cus_001' },
      })
    )
    expect(mockPrismaAdmin.invoice.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { billingProviderPaymentId: 'pay_001' },
        create: expect.objectContaining({ status: 'PAID' }),
      })
    )
    expect(mockPrismaAdmin.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sub_db_001' },
        data: expect.objectContaining({ status: 'ACTIVE' }),
      })
    )
    expect(mockPrismaAdmin.webhookEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'wh_xxx' },
        data: expect.objectContaining({ processedAt: expect.any(Date) }),
      })
    )
    expect(mockRedis.publish).toHaveBeenCalledWith(
      'subscription:invalidated',
      'org_001'
    )
    await app.close()
  })

  it('skip silencioso quando subscription não encontrada (SE1)', async () => {
    mockProvider.validateAndParseWebhook.mockReturnValue(validCanonicalEvent)
    mockPrismaAdmin.subscription.findUnique.mockResolvedValue(null)

    const app = await buildTestApp(mockProvider)
    const res = await app.inject({
      method: 'POST',
      url: '/api/webhooks/asaas',
      headers: { 'asaas-access-token': 'super-secret' },
      payload: { id: 'evt_001', event: 'PAYMENT_RECEIVED' },
    })

    expect(res.statusCode).toBe(200)
    expect(mockPrismaAdmin.invoice.upsert).not.toHaveBeenCalled()
    expect(mockPrismaAdmin.subscription.update).not.toHaveBeenCalled()
    expect(mockPrismaAdmin.webhookEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ processedAt: expect.any(Date) }),
      })
    )
    await app.close()
  })

  it('marca processingError quando processamento falha', async () => {
    mockProvider.validateAndParseWebhook.mockReturnValue(validCanonicalEvent)
    mockPrismaAdmin.invoice.upsert.mockRejectedValue(new Error('db conn lost'))

    const app = await buildTestApp(mockProvider)
    const res = await app.inject({
      method: 'POST',
      url: '/api/webhooks/asaas',
      headers: { 'asaas-access-token': 'super-secret' },
      payload: { id: 'evt_001', event: 'PAYMENT_RECEIVED' },
    })

    expect(res.statusCode).toBe(200)
    expect(mockPrismaAdmin.webhookEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ processingError: 'db conn lost' }),
      })
    )
    await app.close()
  })
})
