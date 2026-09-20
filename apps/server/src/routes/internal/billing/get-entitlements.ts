import type { Entitlements } from '@repo/auth/entitlements'
import type { GetEntitlementsForOrg } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

import { errorResponse, successResponse } from '../../shared/response.schema.js'
import { handleDomainError } from '../../v1/handle-domain-error.js'

const entitlementsPayloadSchema = z.object({
  maxUsers: z.number().int().nullable(),
  maxProposalsPerMonth: z.number().int().nullable(),
  maxChannels: z.number().int().nullable(),
  maxConversationsPerOrg: z.number().int().nullable(),
  maxImportRows: z.number().int().nullable(),
  maxLogoSizeBytes: z.number().int().nullable(),
  aiEnabled: z.boolean(),
  aiMessagesIncluded: z.number().int(),
  aiOverageCentsPerMessage: z.number().int(),
  customBranding: z.boolean(),
  apiAccess: z.boolean(),
  advancedReports: z.boolean(),
  prioritySupport: z.boolean(),
  isActive: z.boolean(),
  isTrialing: z.boolean(),
  trialEndsAt: z.string().datetime().nullable(),
  billingManagedExternally: z.boolean(),
})

function entitlementsToPayload(entitlements: Entitlements) {
  return {
    maxUsers: entitlements.maxUsers,
    maxProposalsPerMonth: entitlements.maxProposalsPerMonth,
    maxChannels: entitlements.maxChannels,
    maxConversationsPerOrg: entitlements.maxConversationsPerOrg,
    maxImportRows: entitlements.maxImportRows,
    maxLogoSizeBytes: entitlements.maxLogoSizeBytes,
    aiEnabled: entitlements.aiEnabled,
    aiMessagesIncluded: entitlements.aiMessagesIncluded,
    aiOverageCentsPerMessage: entitlements.aiOverageCentsPerMessage,
    customBranding: entitlements.customBranding,
    apiAccess: entitlements.apiAccess,
    advancedReports: entitlements.advancedReports,
    prioritySupport: entitlements.prioritySupport,
    isActive: entitlements.isActive,
    isTrialing: entitlements.isTrialing,
    trialEndsAt: entitlements.trialEndsAt?.toISOString() ?? null,
    billingManagedExternally: entitlements.billingManagedExternally,
  }
}

export interface GetInternalEntitlementsApi {
  getEntitlementsFor: (
    organizationId: string
  ) => Pick<GetEntitlementsForOrg, 'execute'>
}

export function getInternalEntitlementsRoute(
  app: FastifyInstance,
  api: GetInternalEntitlementsApi
) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/api/internal/billing/entitlements/:organizationId',
    schema: {
      operationId: 'getInternalEntitlements',
      tags: ['Internal'],
      summary: 'Get entitlements for an organization',
      params: z.object({ organizationId: z.string().min(1) }),
      response: {
        200: successResponse(entitlementsPayloadSchema),
        403: errorResponse,
      },
    },
    handler: async (request, reply) => {
      const pathOrganizationId = request.params.organizationId
      const hmacOrganizationId = request.organizationId!
      if (pathOrganizationId !== hmacOrganizationId) {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'TENANT_MISMATCH',
            message: 'Path organization does not match HMAC tenant',
          },
        })
      }
      try {
        const entitlements = await api
          .getEntitlementsFor(hmacOrganizationId)
          .execute(hmacOrganizationId)
        return reply.status(200).send({
          success: true,
          data: entitlementsToPayload(entitlements),
        })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
