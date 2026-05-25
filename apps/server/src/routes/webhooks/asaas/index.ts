import type { FastifyBaseLogger, FastifyInstance } from 'fastify'
import {
  BillingProviderAuthError,
  BillingProviderInvalidRequestError,
  type CanonicalEvent,
} from '@repo/billing-port'
import {
  processBillingWebhookEvent,
  type BillingSubscriptionRow,
  type ProcessBillingDeps,
  type UpsertInvoiceInput,
} from '@repo/core'
import { Prisma, prismaAdmin } from '@repo/db'
import type IORedis from 'ioredis'
import { invalidateSubscriptionCache } from '../../../lib/subscription-cache.js'

type WebhookProvider = {
  validateAndParseWebhook(
    body: string,
    headers: Record<string, string>
  ): CanonicalEvent
}

function isPrismaUniqueViolation(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'
  )
}

function toInputJsonValue<T>(value: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value))
}

function makeProcessDeps(
  redis: IORedis,
  logger: FastifyBaseLogger
): ProcessBillingDeps {
  return {
    findSubscriptionByProviderCustomerId: async (providerCustomerId) => {
      const row = await prismaAdmin.subscription.findUnique({
        where: { billingProviderCustomerId: providerCustomerId },
        select: {
          id: true,
          organizationId: true,
          status: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          billingManagedExternally: true,
        },
      })
      if (row === null) return null
      const mapped: BillingSubscriptionRow = {
        id: row.id,
        organizationId: row.organizationId,
        status: row.status,
        currentPeriodStart: row.currentPeriodStart,
        currentPeriodEnd: row.currentPeriodEnd,
        billingManagedExternally: row.billingManagedExternally,
      }
      return mapped
    },
    handlers: {
      upsertInvoice: async (input: UpsertInvoiceInput) => {
        await prismaAdmin.invoice.upsert({
          where: { billingProviderPaymentId: input.billingProviderPaymentId },
          create: {
            organizationId: input.organizationId,
            subscriptionId: input.subscriptionId,
            billingProvider: 'ASAAS',
            billingProviderPaymentId: input.billingProviderPaymentId,
            amountCents: input.amountCents,
            baseAmountCents: input.amountCents,
            status: input.status,
            dueDate: input.periodEnd,
            paidAt: input.paidAt,
            periodStart: input.periodStart,
            periodEnd: input.periodEnd,
          },
          update: {
            status: input.status,
            paidAt: input.paidAt,
          },
        })
      },
      updateSubscriptionStatus: async (
        subscriptionId: string,
        status: 'ACTIVE' | 'PAST_DUE' | 'CANCELED',
        opts?: { canceledAt?: Date }
      ) => {
        await prismaAdmin.subscription.update({
          where: { id: subscriptionId },
          data: {
            status,
            ...(opts?.canceledAt ? { canceledAt: opts.canceledAt } : {}),
          },
        })
      },
      publishInvalidation: async (organizationId: string) => {
        await invalidateSubscriptionCache(redis, organizationId)
      },
    },
    logger,
  }
}

export function asaasWebhookRoute(
  app: FastifyInstance,
  provider: WebhookProvider | null,
  redis: IORedis
): void {
  app.post(
    '/api/webhooks/asaas',
    {
      config: { rateLimit: false },
    },
    async (request, reply) => {
      if (provider === null) {
        return reply.status(503).send({
          success: false,
          error: {
            code: 'PROVIDER_UNAVAILABLE',
            message: 'Asaas integration not configured on this instance',
          },
        })
      }

      const body =
        typeof request.body === 'string'
          ? request.body
          : JSON.stringify(request.body ?? {})

      const headers: Record<string, string> = {}
      for (const [k, v] of Object.entries(request.headers)) {
        if (typeof v === 'string') {
          headers[k] = v
        } else if (Array.isArray(v) && typeof v[0] === 'string') {
          headers[k] = v[0]
        }
      }

      let canonical: CanonicalEvent
      try {
        canonical = provider.validateAndParseWebhook(body, headers)
      } catch (err) {
        if (err instanceof BillingProviderAuthError) {
          request.log.warn({ err: err.message }, 'Asaas webhook: invalid token')
          return reply.status(401).send({
            success: false,
            error: { code: 'INVALID_TOKEN', message: err.message },
          })
        }
        if (err instanceof BillingProviderInvalidRequestError) {
          request.log.warn(
            { err: err.message },
            'Asaas webhook: invalid payload'
          )
          return reply.status(400).send({
            success: false,
            error: { code: 'INVALID_PAYLOAD', message: err.message },
          })
        }
        throw err
      }

      let webhookEventId: string
      try {
        const inserted = await prismaAdmin.webhookEvent.create({
          data: {
            source: 'asaas',
            externalId: canonical.externalId,
            eventType: canonical.type,
            signatureValid: true,
            payload: toInputJsonValue(canonical),
          },
          select: { id: true },
        })
        webhookEventId = inserted.id
      } catch (err) {
        if (isPrismaUniqueViolation(err)) {
          request.log.info(
            { externalId: canonical.externalId },
            'Asaas webhook: dedup hit (already received)'
          )
          return reply.status(200).send({ ok: true, deduped: true })
        }
        throw err
      }

      try {
        const deps = makeProcessDeps(redis, request.log)
        const result = await processBillingWebhookEvent(deps, canonical)
        await prismaAdmin.webhookEvent.update({
          where: { id: webhookEventId },
          data: { processedAt: new Date() },
        })
        request.log.info(
          {
            eventType: canonical.type,
            externalId: canonical.externalId,
            result,
          },
          'Asaas webhook: processed'
        )
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err)
        await prismaAdmin.webhookEvent.update({
          where: { id: webhookEventId },
          data: { processingError: errMsg },
        })
        request.log.error(
          { err: errMsg, externalId: canonical.externalId },
          'Asaas webhook: processing failed (event stored, retry via reconciliation worker — Fase 4E)'
        )
      }

      return reply.status(200).send({ ok: true })
    }
  )
}
