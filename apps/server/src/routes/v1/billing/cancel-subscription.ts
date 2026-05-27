import type { BillingProvider } from '@repo/billing-port'
import { prismaAdmin } from '@repo/db'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import type IORedis from 'ioredis'

import { invalidateSubscriptionCache } from '../../../lib/subscription-cache.js'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { errorResponse } from '../../shared/response.schema.js'
import { cancelSubscriptionResponse } from './_schemas.js'

export function cancelBillingSubscriptionRoute(
  app: FastifyInstance,
  asaasProvider: BillingProvider | null,
  redis: IORedis
) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/api/v1/billing/cancel-subscription',
    schema: {
      operationId: 'cancelBillingSubscription',
      tags: ['Billing'],
      summary:
        'Cancel current subscription; access continues until currentPeriodEnd',
      response: {
        200: cancelSubscriptionResponse,
        400: errorResponse,
        403: errorResponse,
        404: errorResponse,
        502: errorResponse,
        503: errorResponse,
      },
    },
    preHandler: [requireAbility('manage', 'Organization')],
    handler: async (request, reply) => {
      const organizationId = request.organizationId ?? ''

      const subscription = await prismaAdmin.subscription.findUnique({
        where: { organizationId },
      })

      if (!subscription) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'SUBSCRIPTION_NOT_FOUND',
            message: 'Nenhuma assinatura ativa.',
          },
        })
      }

      if (subscription.billingManagedExternally) {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'SUBSCRIPTION_MANAGED_EXTERNALLY',
            message:
              'Assinatura gerenciada externamente. Entre em contato com o suporte.',
          },
        })
      }

      if (
        subscription.status === 'CANCELED' ||
        subscription.status === 'EXPIRED'
      ) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'SUBSCRIPTION_ALREADY_CANCELED',
            message: 'Assinatura já está cancelada.',
          },
        })
      }

      if (!asaasProvider) {
        return reply.status(503).send({
          success: false,
          error: {
            code: 'BILLING_PROVIDER_UNAVAILABLE',
            message: 'Provedor de billing indisponível no momento.',
          },
        })
      }

      if (
        subscription.billingProviderSubscriptionId &&
        subscription.billingProviderCustomerId
      ) {
        try {
          await asaasProvider.cancelSubscription({
            provider: 'asaas',
            externalId: subscription.billingProviderSubscriptionId,
            customerRef: {
              provider: 'asaas',
              externalId: subscription.billingProviderCustomerId,
            },
          })
        } catch (err) {
          request.log.error(
            { err, organizationId, subscriptionId: subscription.id },
            'Failed to cancel subscription with billing provider'
          )
          return reply.status(502).send({
            success: false,
            error: {
              code: 'BILLING_PROVIDER_ERROR',
              message: 'Erro ao cancelar a assinatura no provedor.',
            },
          })
        }
      }

      const canceledAt = new Date()
      const updated = await prismaAdmin.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'CANCELED',
          canceledAt,
        },
      })

      await invalidateSubscriptionCache(redis, organizationId)

      return reply.send({
        success: true,
        data: {
          canceledAt: canceledAt.toISOString(),
          currentPeriodEnd: updated.currentPeriodEnd.toISOString(),
        },
      })
    },
  })
}
