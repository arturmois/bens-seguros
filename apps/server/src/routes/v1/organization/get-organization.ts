import { container, type CacheService, type StorageProvider } from '@repo/core'
import { prisma } from '@repo/db'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { errorResponse } from '../../shared/response.schema.js'
import { organizationDetailResponse } from './_schemas.js'

const ORG_CACHE_TTL = 3600 // 1h

interface OrgCacheData {
  id: string
  name: string
  slug: string
  logoKey: string | null
  createdAt: string
}

function resolveCache(): CacheService | null {
  try {
    return container.resolve<CacheService>('CacheService')
  } catch {
    return null
  }
}

export function getOrganizationRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/api/v1/organization',
    schema: {
      operationId: 'getOrganization',
      tags: ['Organization'],
      summary: 'Get current organization details',
      response: { 200: organizationDetailResponse, 404: errorResponse },
    },
    handler: async (request, reply) => {
      const organizationId = request.organizationId!
      const cacheKey = `cache:${organizationId}:org`

      const cacheService = resolveCache()
      if (cacheService) {
        const cached = await cacheService.get<OrgCacheData>(cacheKey)
        if (cached) {
          let logoUrl: string | null = null
          if (cached.logoKey) {
            const storage =
              container.resolve<StorageProvider>('StorageProvider')
            logoUrl = await storage.getSignedUrl(cached.logoKey)
          }
          return reply.send({
            success: true,
            data: {
              id: cached.id,
              name: cached.name,
              slug: cached.slug,
              logo: logoUrl,
              createdAt: cached.createdAt,
            },
          })
        }
      }

      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          createdAt: true,
        },
      })

      if (!org) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'ORGANIZATION_NOT_FOUND',
            message: 'Organização não encontrada',
          },
        })
      }

      if (cacheService) {
        await cacheService.set(
          cacheKey,
          {
            id: org.id,
            name: org.name,
            slug: org.slug,
            logoKey: org.logo,
            createdAt: org.createdAt.toISOString(),
          } satisfies OrgCacheData,
          ORG_CACHE_TTL
        )
      }

      let logoUrl: string | null = null
      if (org.logo) {
        const storage = container.resolve<StorageProvider>('StorageProvider')
        logoUrl = await storage.getSignedUrl(org.logo)
      }

      return reply.send({
        success: true,
        data: {
          id: org.id,
          name: org.name,
          slug: org.slug,
          logo: logoUrl,
          createdAt: org.createdAt.toISOString(),
        },
      })
    },
  })
}
