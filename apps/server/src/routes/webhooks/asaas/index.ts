import {
  BillingProviderAuthError,
  BillingProviderInvalidRequestError,
  BillingProviderUnhandledEventError,
  type CanonicalEvent,
} from '@repo/billing-port'
import { container, ProcessBillingWebhookEvent } from '@repo/core'
import { Prisma, prismaAdmin } from '@repo/db'
import type { FastifyInstance } from 'fastify'
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
        if (err instanceof BillingProviderUnhandledEventError) {
          request.log.info(
            { reason: err.reason, message: err.message },
            'Asaas webhook: unhandled event, skipping'
          )
          return reply.status(200).send({
            success: true,
            data: { skipped: true, reason: err.reason },
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
        const useCase = container.resolve(ProcessBillingWebhookEvent)
        const result = await useCase.execute(canonical, {
          logger: request.log,
          publishInvalidation: async (orgId) => {
            await invalidateSubscriptionCache(redis, orgId)
          },
        })
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
