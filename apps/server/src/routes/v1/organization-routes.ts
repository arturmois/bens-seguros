import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { container, type StorageProvider } from '@repo/core'
import { prisma } from '@repo/db'
import { tenantMiddleware } from '../../middlewares/tenant-middleware.js'
import { requireAbility } from '../../middlewares/ability-middleware.js'
import { updateOrganizationSchema } from '../../schemas/organization.schemas.js'
import { auditUpdate } from '../../services/audit-logger.js'

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

export async function organizationRoutes(app: FastifyInstance) {
  app.addHook('preHandler', tenantMiddleware)

  // GET /api/v1/organization — read current organization details
  app.get(
    '/api/v1/organization',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const organizationId = request.organizationId!

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
            message: 'Organizacao nao encontrada',
          },
        })
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
    }
  )

  // PUT /api/v1/organization — update organization name and slug (OWNER only)
  app.put(
    '/api/v1/organization',
    { preHandler: [requireAbility('manage', 'Organization')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const organizationId = request.organizationId!
      const body = updateOrganizationSchema.parse(request.body)

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
            message: 'Este slug ja esta em uso por outra organizacao',
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
    }
  )

  // PUT /api/v1/organization/logo — upload organization logo (OWNER only)
  app.put(
    '/api/v1/organization/logo',
    { preHandler: [requireAbility('manage', 'Organization')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const organizationId = request.organizationId!

      const file = await request.file()

      if (!file) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'FILE_REQUIRED',
            message: 'Um arquivo de imagem e obrigatorio',
          },
        })
      }

      if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_FILE_TYPE',
            message:
              'Tipo de arquivo invalido. Permitidos: JPEG, PNG, WebP, GIF',
          },
        })
      }

      const buffer = await file.toBuffer()

      if (buffer.length > MAX_LOGO_SIZE) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'Arquivo excede o tamanho maximo de 2MB',
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
    }
  )
}
