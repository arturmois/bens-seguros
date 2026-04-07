import { renderToBuffer } from '@react-pdf/renderer'
import {
  container,
  GetProposal,
  SendQuote,
  type DocumentRepository,
  type StorageProvider,
} from '@repo/core'
import { prisma } from '@repo/db'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { ProposalQuotePdf } from '../../../pdf-templates/proposal-quote-pdf.js'
import { enqueueSendQuoteEmail } from '../../../services/send-quote-enqueuer.js'
import { handleDomainError } from '../handle-domain-error.js'
import { errorResponse, idParam, sendQuoteResponse } from './_schemas.js'

const CENTS_PER_REAL = 100

function formatCurrency(cents: number): string {
  return (cents / CENTS_PER_REAL).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export function sendQuoteRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/api/v1/proposals/:id/send-quote',
    schema: {
      tags: ['Proposals'],
      summary: 'Generate PDF and send quote to client via email',
      operationId: 'sendQuote',
      params: idParam,
      response: {
        202: sendQuoteResponse,
        404: errorResponse,
        422: errorResponse,
      },
    },
    preHandler: [requireAbility('update', 'Proposal')],
    handler: async (request, reply) => {
      const { id } = request.params
      const organizationId = request.organizationId!

      const getProposalUseCase = container.resolve(GetProposal)
      let proposal
      try {
        proposal = await getProposalUseCase.execute(id, organizationId)
      } catch (error) {
        return handleDomainError(error, reply)
      }

      const client = await prisma.client.findFirst({
        where: { id: proposal.clientId, organizationId },
        select: { email: true, name: true },
      })

      const sendQuoteUseCase = container.resolve(SendQuote)
      try {
        await sendQuoteUseCase.validate(
          id,
          organizationId,
          client?.email ?? null
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

      const storage = container.resolve<StorageProvider>('StorageProvider')
      let logoUrl: string | null = null
      if (org.logo) {
        logoUrl = await storage.getSignedUrl(org.logo)
      }

      const buffer = Buffer.from(
        await renderToBuffer(
          ProposalQuotePdf({
            proposal: proposal.toJSON(),
            organization: { id: org.id, name: org.name, logo: logoUrl },
          })
        )
      )

      const storageKey = `organizations/${organizationId}/proposals/${id}/cotacao.pdf`
      await storage.upload(storageKey, buffer, 'application/pdf')

      const documentRepo =
        container.resolve<DocumentRepository>('DocumentRepository')
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

      const salesperson = await prisma.user.findUnique({
        where: { id: proposal.salespersonId },
        select: { name: true, email: true },
      })

      await enqueueSendQuoteEmail({
        proposalId: id,
        organizationId,
        storageKey,
        recipientEmail: client!.email!,
        recipientName: client!.name,
        salespersonName: salesperson?.name ?? org.name,
        salespersonEmail: salesperson?.email ?? null,
        organizationName: org.name,
        branch: proposal.branch,
        premiumFormatted: formatCurrency(proposal.premiumValueInCents),
      })

      return reply.status(202).send({
        success: true,
        data: { message: 'Cotação sendo enviada' },
      })
    },
  })
}
