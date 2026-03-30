import { renderToBuffer } from '@react-pdf/renderer'
import {
  container,
  GetPolicy,
  type DocumentRepository,
  type StorageProvider,
} from '@repo/core'
import { prisma } from '@repo/db'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { PolicySummaryPdf } from '../../../pdf-templates/policy-summary-pdf.js'
import { handleDomainError } from '../handle-domain-error.js'
import {
  generatePdfQuery,
  idParam,
  policyPdfResponse,
  errorResponse,
} from './_schemas.js'

export function generatePolicyPdfRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/api/v1/policies/:id/pdf',
    schema: {
      tags: ['Policies'],
      summary: 'Generate or retrieve a cached policy PDF',
      operationId: 'generatePolicyPdf',
      params: idParam,
      querystring: generatePdfQuery,
      response: { 200: policyPdfResponse, 404: errorResponse },
    },
    preHandler: [requireAbility('read', 'Policy')],
    handler: async (request, reply) => {
      const organizationId = request.organizationId!
      const forceRegenerate = request.query.force === 'true'

      const documentRepo =
        container.resolve<DocumentRepository>('DocumentRepository')
      const storage = container.resolve<StorageProvider>('StorageProvider')

      if (!forceRegenerate) {
        const existing = await documentRepo.findByEntity(
          'POLICY',
          request.params.id,
          organizationId
        )
        const existingPdf = existing.find((doc) => doc.type === 'POLICY_PDF')
        if (existingPdf) {
          const url = await storage.getSignedUrl(existingPdf.storageKey)
          return reply.send({ success: true, data: { url, cached: true } })
        }
      }

      const getPolicyUseCase = container.resolve(GetPolicy)
      let policy
      try {
        policy = await getPolicyUseCase.execute(
          request.params.id,
          organizationId
        )
      } catch (error) {
        return handleDomainError(error, reply)
      }

      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { id: true, name: true, logo: true },
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

      let logoUrl: string | null = null
      if (org.logo) {
        logoUrl = await storage.getSignedUrl(org.logo)
      }

      const organizationData = {
        id: org.id,
        name: org.name,
        logo: logoUrl,
      }

      const buffer = Buffer.from(
        await renderToBuffer(
          PolicySummaryPdf({
            policy,
            organization: organizationData,
          })
        )
      )

      const storageKey = `organizations/${organizationId}/policies/${request.params.id}/apolice.pdf`
      await storage.upload(storageKey, buffer, 'application/pdf')

      await documentRepo.create({
        organizationId,
        entityType: 'POLICY',
        entityId: request.params.id,
        type: 'POLICY_PDF',
        fileName: `apolice-${policy.policyNumber}.pdf`,
        mimeType: 'application/pdf',
        sizeBytes: buffer.length,
        storageKey,
        createdBy: request.user!.id,
      })

      const url = await storage.getSignedUrl(storageKey)
      return reply.send({ success: true, data: { url, cached: false } })
    },
  })
}
