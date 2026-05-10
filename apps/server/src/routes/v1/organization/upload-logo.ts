import {
  container,
  LogoFileRequiredError,
  UploadOrganizationLogo,
} from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { auditUpdate } from '../../../services/audit-logger.js'
import { errorResponse } from '../../shared/response.schema.js'
import { handleDomainError } from '../handle-domain-error.js'
import { organizationDetailResponse } from './_schemas.js'

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
      const useCase = container.resolve(UploadOrganizationLogo)
      try {
        const file = await request.file()
        if (!file) {
          throw new LogoFileRequiredError()
        }
        const buffer = await file.toBuffer()
        const { view, previousLogoKey, newLogoKey } = await useCase.execute({
          organizationId,
          buffer,
          mimeType: file.mimetype,
        })
        auditUpdate({
          request,
          entityType: 'Organization',
          entityId: organizationId,
          before: { logo: previousLogoKey },
          after: { logo: newLogoKey },
        })
        return reply.send({
          success: true,
          data: {
            id: view.id,
            name: view.name,
            slug: view.slug,
            logo: view.logo,
            createdAt: view.createdAt.toISOString(),
          },
        })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
