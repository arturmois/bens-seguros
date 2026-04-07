import { renderToBuffer } from '@react-pdf/renderer'
import {
  container,
  GetProposal,
  type DocumentRepository,
  type StorageProvider,
} from '@repo/core'
import { prisma } from '@repo/db'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { ProposalQuotePdf } from '../../../pdf-templates/proposal-quote-pdf.js'
import { handleDomainError } from '../handle-domain-error.js'
import { errorResponse, idParam, proposalPdfResponse } from './_schemas.js'

export function generateProposalPdfRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/api/v1/proposals/:id/pdf',
    schema: {
      tags: ['Proposals'],
      summary: 'Generate or retrieve proposal PDF',
      operationId: 'generateProposalPdf',
      params: idParam,
      response: { 200: proposalPdfResponse, 404: errorResponse },
    },
    preHandler: [requireAbility('read', 'Proposal')],
    handler: async (request, reply) => {
      const { id } = request.params
      const organizationId = request.organizationId!
      const forceRegenerate =
        typeof request.query === 'object' &&
        request.query !== null &&
        'force' in request.query &&
        (request.query as Record<string, unknown>)['force'] === 'true'

      const documentRepo =
        container.resolve<DocumentRepository>('DocumentRepository')
      const storage = container.resolve<StorageProvider>('StorageProvider')

      if (!forceRegenerate) {
        const existing = await documentRepo.findByEntity(
          'PROPOSAL',
          id,
          organizationId
        )
        const existingPdf = existing.find(
          (doc) => doc.type === 'QUOTATION_PDF' || doc.type === 'POLICY_PDF'
        )
        if (existingPdf) {
          const url = await storage.getSignedUrl(existingPdf.storageKey)
          return reply.send({ success: true, data: { url, cached: true } })
        }
      }

      const getProposalUseCase = container.resolve(GetProposal)
      let proposal
      try {
        proposal = await getProposalUseCase.execute(id, organizationId)
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
          ProposalQuotePdf({
            proposal: proposal.toJSON(),
            organization: organizationData,
          })
        )
      )

      const storageKey = `organizations/${organizationId}/proposals/${id}/cotacao.pdf`
      await storage.upload(storageKey, buffer, 'application/pdf')

      await documentRepo.upsertByStorageKey({
        organizationId,
        entityType: 'PROPOSAL',
        entityId: id,
        type: 'QUOTATION_PDF',
        fileName: `cotacao-${id.slice(0, 8)}.pdf`,
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
