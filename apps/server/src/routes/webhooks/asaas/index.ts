import type { FastifyInstance } from 'fastify'
import {
  BillingProviderAuthError,
  BillingProviderInvalidRequestError,
  type CanonicalEvent,
} from '@repo/billing-port'
import { Prisma, prismaAdmin } from '@repo/db'

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
  provider: WebhookProvider | null
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

      try {
        await prismaAdmin.webhookEvent.create({
          data: {
            source: 'asaas',
            externalId: canonical.externalId,
            eventType: canonical.type,
            signatureValid: true,
            payload: toInputJsonValue(canonical),
          },
        })
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

      request.log.info(
        {
          eventType: canonical.type,
          externalId: canonical.externalId,
          providerCustomerId: canonical.providerCustomerId,
          providerSubscriptionId: canonical.providerSubscriptionId,
        },
        'Asaas webhook: stored'
      )

      return reply.status(200).send({ ok: true })
    }
  )
}
