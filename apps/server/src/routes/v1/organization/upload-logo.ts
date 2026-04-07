import { container, type CacheService, type StorageProvider } from '@repo/core'
import { prisma } from '@repo/db'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { auditUpdate } from '../../../services/audit-logger.js'
import { errorResponse } from '../../shared/response.schema.js'
import { organizationDetailResponse } from './_schemas.js'

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

const MAX_LOGO_SIZE = 2 * 1024 * 1024 // 2MB

function resolveCache(): CacheService | null {
  try {
    return container.resolve<CacheService>('CacheService')
  } catch {
    return null
  }
}

export function uploadLogoRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'PUT',
    url: '/api/v1/organization/logo',
    schema: {
      operationId: 'uploadOrganizationLogo',
      tags: ['Organization'],
      summary: 'Upload organization logo',
      response: { 200: organizationDetailResponse, 400: errorResponse },
    },
    preHandler: [requireAbility('manage', 'Organization')],
    handler: async (request, reply) => {
      const organizationId = request.organizationId!

      const file = await request.file()

      if (!file) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'FILE_REQUIRED',
            message: 'Um arquivo de imagem é obrigatório',
          },
        })
      }

      if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_FILE_TYPE',
            message:
              'Tipo de arquivo inválido. Permitidos: JPEG, PNG, WebP, GIF',
          },
        })
      }

      const buffer = await file.toBuffer()

      if (buffer.length > MAX_LOGO_SIZE) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'Arquivo excede o tamanho máximo de 2MB',
          },
        })
      }

      const storage = container.resolve<StorageProvider>('StorageProvider')

      // Delete old logo if it exists
      const currentOrg = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { logo: true },
      })

      if (currentOrg?.logo) {
        await storage.delete(currentOrg.logo).catch((err: unknown) => {
          request.log.warn(
            { err, key: currentOrg.logo },
            'Failed to delete old logo (non-critical)'
          )
        })
      }

      const extension = MIME_TO_EXT[file.mimetype] ?? 'png'
      const storageKey = `organizations/${organizationId}/logo.${extension}`

      await storage.upload(storageKey, buffer, file.mimetype)

      const updated = await prisma.organization.update({
        where: { id: organizationId },
        data: { logo: storageKey },
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
        before: { logo: currentOrg?.logo },
        after: { logo: storageKey },
      })

      const cacheService = resolveCache()
      if (cacheService) {
        await cacheService.delete(`cache:${organizationId}:org`)
      }

      const logoUrl = await storage.getSignedUrl(storageKey)

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
