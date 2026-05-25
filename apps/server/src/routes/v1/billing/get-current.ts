import { buildEntitlements } from '@repo/core'
import {
  DEFAULT_PERMISSIVE_ENTITLEMENTS,
  type Entitlements,
} from '@repo/auth/entitlements'
import type { FastifyInstance } from 'fastify'
import type IORedis from 'ioredis'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

import { getSubscriptionFromCache } from '../../../lib/subscription-cache.js'
import { billingCurrentResponse } from './_schemas.js'

type SubscriptionStatusName =
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELED'
  | 'EXPIRED'
  | 'BILLED_EXTERNALLY'

interface SubscriptionPayload {
  id: string
  status: SubscriptionStatusName
  billingManagedExternally: boolean
  trialEndsAt: string | null
  currentPeriodEnd: string | null
  plan: {
    slug: string
    maxUsers: number | null
    maxProposalsPerMonth: number | null
    maxChannels: number | null
    maxConversationsPerOrg: number | null
    maxImportRows: number | null
    maxLogoSizeBytes: number | null
    aiEnabled: boolean
    aiMessagesIncluded: number
    aiOverageCentsPerMessage: number
  }
}

function entitlementsToPayload(e: Entitlements) {
  return {
    maxUsers: e.maxUsers,
    maxProposalsPerMonth: e.maxProposalsPerMonth,
    maxChannels: e.maxChannels,
    maxConversationsPerOrg: e.maxConversationsPerOrg,
    maxImportRows: e.maxImportRows,
    maxLogoSizeBytes: e.maxLogoSizeBytes,
    aiEnabled: e.aiEnabled,
    aiMessagesIncluded: e.aiMessagesIncluded,
    aiOverageCentsPerMessage: e.aiOverageCentsPerMessage,
    customBranding: e.customBranding,
    apiAccess: e.apiAccess,
    advancedReports: e.advancedReports,
    prioritySupport: e.prioritySupport,
    isActive: e.isActive,
    isTrialing: e.isTrialing,
    trialEndsAt: e.trialEndsAt?.toISOString() ?? null,
    billingManagedExternally: e.billingManagedExternally,
  }
}

export function getBillingCurrentRoute(app: FastifyInstance, redis: IORedis) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/api/v1/billing/current',
    schema: {
      operationId: 'getBillingCurrent',
      tags: ['Billing'],
      summary: 'Get current subscription and entitlements for the active org',
      response: { 200: billingCurrentResponse },
    },
    handler: async (request, reply) => {
      // Tenant middleware (preHandler) guarantees organizationId is set.
      const organizationId = request.organizationId ?? ''
      const snapshot = await getSubscriptionFromCache(redis, organizationId)

      let subscription: SubscriptionPayload | null = null
      let entitlements: Entitlements = DEFAULT_PERMISSIVE_ENTITLEMENTS

      if (snapshot) {
        entitlements = buildEntitlements(
          {
            status: snapshot.status,
            trialEndsAt: snapshot.trialEndsAt,
            billingManagedExternally: snapshot.billingManagedExternally,
            customQuotas: snapshot.customQuotas,
          },
          snapshot.plan
        )
        subscription = {
          id: snapshot.id,
          status: snapshot.status,
          billingManagedExternally: snapshot.billingManagedExternally,
          trialEndsAt: snapshot.trialEndsAt?.toISOString() ?? null,
          currentPeriodEnd: snapshot.currentPeriodEnd?.toISOString() ?? null,
          plan: {
            slug: snapshot.plan.slug,
            maxUsers: snapshot.plan.maxUsers,
            maxProposalsPerMonth: snapshot.plan.maxProposalsPerMonth,
            maxChannels: snapshot.plan.maxChannels,
            maxConversationsPerOrg: snapshot.plan.maxConversationsPerOrg,
            maxImportRows: snapshot.plan.maxImportRows,
            maxLogoSizeBytes: snapshot.plan.maxLogoSizeBytes,
            aiEnabled: snapshot.plan.aiEnabled,
            aiMessagesIncluded: snapshot.plan.aiMessagesIncluded,
            aiOverageCentsPerMessage: snapshot.plan.aiOverageCentsPerMessage,
          },
        }
      }

      return reply.send({
        success: true,
        data: {
          subscription,
          entitlements: entitlementsToPayload(entitlements),
        },
      })
    },
  })
}
