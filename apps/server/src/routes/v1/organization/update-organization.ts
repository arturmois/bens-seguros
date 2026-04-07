import { container, type CacheService, type StorageProvider } from '@repo/core'
import { prisma } from '@repo/db'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { auditUpdate } from '../../../services/audit-logger.js'
import { errorResponse } from '../../shared/response.schema.js'
import {
  organizationDetailResponse,
  updateOrganizationSchema,
} from './_schemas.js'

function resolveCache(): CacheService | null {
  try {
    return container.resolve<CacheService>('CacheService')
  } catch {
    return null
  }
}

export function updateOrganizationRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'PUT',
    url: '/api/v1/organization',
    schema: {
      operationId: 'updateOrganization',
      tags: ['Organization'],
      summary: 'Update organization name and slug',
      body: updateOrganizationSchema,
      response: { 200: organizationDetailResponse, 409: errorResponse },
    },
    preHandler: [requireAbility('manage', 'Organization')],
    handler: async (request, reply) => {
      const organizationId = request.organizationId!
      const body = request.body

      // Check slug uniqueness (excluding current org)
      const existingOrg = await prisma.organization.findFirst({
        where: {
          slug: body.slug,
          id: { not: organizationId },
        },
        select: { id: true },
      })

      if (existingOrg) {
        return reply.status(409).send({
          success: false,
          error: {
            code: 'SLUG_CONFLICT',
            message: 'Este slug já está em uso por outra organização',
          },
        })
      }

      const before = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { name: true, slug: true },
      })

      const updated = await prisma.organization.update({
        where: { id: organizationId },
        data: { name: body.name, slug: body.slug },
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          createdAt: true,
        },
      })

      auditUpdate({
        request,
        entityType: 'Organization',
        entityId: organizationId,
        before,
        after: { name: body.name, slug: body.slug },
      })

      const cacheService = resolveCache()
      if (cacheService) {
        await cacheService.delete(`cache:${organizationId}:org`)
      }

      let logoUrl: string | null = null
      if (updated.logo) {
        const storage = container.resolve<StorageProvider>('StorageProvider')
        logoUrl = await storage.getSignedUrl(updated.logo)
      }

      return reply.send({
        success: true,
        data: {
          id: updated.id,
          name: updated.name,
          slug: updated.slug,
          logo: logoUrl,
          createdAt: updated.createdAt.toISOString(),
        },
      })
    },
  })
}
