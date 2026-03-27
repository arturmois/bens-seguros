import { renderToBuffer } from '@react-pdf/renderer'
import {
  AdvanceProposalStage,
  BranchMismatchError,
  ChecklistIncompleteError,
  CompleteChecklistByAttachment,
  container,
  CreateProposal,
  ExportProposalsCsv,
  GetProposal,
  InvalidStageTransitionError,
  ListChecklistItems,
  ListProposals,
  MarkProposalLost,
  ProposalDetailsRequiredError,
  ProposalNotFoundError,
  UpdateProposalDetails,
  type DocumentRepository,
  type StorageProvider,
} from '@repo/core'
import { prisma } from '@repo/db'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { requireAbility } from '../../middlewares/ability-middleware.js'
import { tenantMiddleware } from '../../middlewares/tenant-middleware.js'
import { ProposalQuotePdf } from '../../pdf-templates/proposal-quote-pdf.js'
import { idParamSchema } from '../../schemas/client.schemas.js'
import { updateProposalDetailsBodySchema } from '../../schemas/proposal-details.schemas.js'
import {
  checklistItemIdParamSchema,
  createProposalBodySchema,
  listProposalsQuerySchema,
  markLostBodySchema,
} from '../../schemas/proposal.schemas.js'
import { auditCreate, auditUpdate } from '../../services/audit-logger.js'

function handleProposalError(error: unknown, reply: FastifyReply) {
  if (error instanceof ProposalNotFoundError) {
    return reply.status(404).send({
      success: false,
      error: { code: error.code, message: error.message },
    })
  }
  if (error instanceof InvalidStageTransitionError) {
    return reply.status(422).send({
      success: false,
      error: { code: error.code, message: error.message },
    })
  }
  if (error instanceof ProposalDetailsRequiredError) {
    return reply.status(422).send({
      success: false,
      error: { code: error.code, message: error.message },
    })
  }
  if (error instanceof BranchMismatchError) {
    return reply.status(422).send({
      success: false,
      error: { code: error.code, message: error.message },
    })
  }
  if (error instanceof ChecklistIncompleteError) {
    return reply.status(422).send({
      success: false,
      error: { code: error.code, message: error.message },
    })
  }
  throw error
}

export async function proposalRoutes(app: FastifyInstance) {
  app.addHook('preHandler', tenantMiddleware)

  app.post(
    '/api/v1/proposals',
    { preHandler: [requireAbility('create', 'Proposal')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = createProposalBodySchema.parse(request.body)
      const useCase = container.resolve(CreateProposal)
      const proposal = await useCase.execute({
        organizationId: request.organizationId!,
        salespersonId: request.user!.id,
        ...body,
      })
      auditCreate({
        request,
        entityType: 'Proposal',
        entityId: proposal.id,
        after: proposal,
      })
      return reply.status(201).send({ success: true, data: proposal.toJSON() })
    }
  )

  // IMPORTANT: export route must be registered BEFORE /:id to avoid route conflict
  app.get(
    '/api/v1/proposals/export',
    { preHandler: [requireAbility('read', 'Proposal')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { stage, clientId, boardType, search } =
        listProposalsQuerySchema.parse(request.query)
      const useCase = container.resolve(ExportProposalsCsv)
      const csv = await useCase.execute({
        organizationId: request.organizationId!,
        stage,
        clientId,
        boardType,
        search,
      })
      return reply
        .header('Content-Type', 'text/csv')
        .header('Content-Disposition', 'attachment; filename="propostas.csv"')
        .send(csv)
    }
  )

  app.get(
    '/api/v1/proposals',
    { preHandler: [requireAbility('read', 'Proposal')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = listProposalsQuerySchema.parse(request.query)
      const useCase = container.resolve(ListProposals)
      const { limit, cursor, ...filters } = query
      const result = await useCase.execute(
        { organizationId: request.organizationId!, ...filters },
        { limit, cursor }
      )
      return reply.send({
        success: true,
        data: result.items.map((p) => p.toJSON()),
        meta: { total: result.total, nextCursor: result.nextCursor },
      })
    }
  )

  // IMPORTANT: /pdf route must be registered BEFORE /:id to avoid route conflict
  app.post(
    '/api/v1/proposals/:id/pdf',
    { preHandler: [requireAbility('read', 'Proposal')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = idParamSchema.parse(request.params)
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
        const existingPdf = existing.find((doc) => doc.type === 'POLICY_PDF')
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
        return handleProposalError(error, reply)
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
            message: 'Organizacao nao encontrada',
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

      await documentRepo.create({
        organizationId,
        entityType: 'PROPOSAL',
        entityId: id,
        type: 'POLICY_PDF',
        fileName: `cotacao-${id.slice(0, 8)}.pdf`,
        mimeType: 'application/pdf',
        sizeBytes: buffer.length,
        storageKey,
        createdBy: request.user!.id,
      })

      const url = await storage.getSignedUrl(storageKey)
      return reply.send({ success: true, data: { url, cached: false } })
    }
  )

  app.get(
    '/api/v1/proposals/:id',
    { preHandler: [requireAbility('read', 'Proposal')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = idParamSchema.parse(request.params)
      const useCase = container.resolve(GetProposal)
      try {
        const proposal = await useCase.execute(id, request.organizationId!)
        return reply.send({ success: true, data: proposal.toJSON() })
      } catch (error) {
        return handleProposalError(error, reply)
      }
    }
  )

  app.post(
    '/api/v1/proposals/:id/advance',
    { preHandler: [requireAbility('update', 'Proposal')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = idParamSchema.parse(request.params)
      const useCase = container.resolve(AdvanceProposalStage)
      try {
        const result = await useCase.execute(id, request.organizationId!)
        auditUpdate({
          request,
          entityType: 'Proposal',
          entityId: id,
          after: { stage: result.stage },
        })
        return reply.send({ success: true, data: result.toJSON() })
      } catch (error) {
        return handleProposalError(error, reply)
      }
    }
  )

  app.post(
    '/api/v1/proposals/:id/lost',
    { preHandler: [requireAbility('update', 'Proposal')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = idParamSchema.parse(request.params)
      const { reason } = markLostBodySchema.parse(request.body)
      const useCase = container.resolve(MarkProposalLost)
      try {
        const proposal = await useCase.execute(
          id,
          request.organizationId!,
          reason
        )
        auditUpdate({
          request,
          entityType: 'Proposal',
          entityId: id,
          after: { stage: 'LOST' },
        })
        return reply.send({ success: true, data: proposal.toJSON() })
      } catch (error) {
        return handleProposalError(error, reply)
      }
    }
  )

  app.put(
    '/api/v1/proposals/:id/details',
    { preHandler: [requireAbility('update', 'Proposal')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = idParamSchema.parse(request.params)
      const body = updateProposalDetailsBodySchema.parse(request.body)
      const useCase = container.resolve(UpdateProposalDetails)
      try {
        const updated = await useCase.execute(id, request.organizationId!, body)
        auditUpdate({
          request,
          entityType: 'Proposal',
          entityId: id,
          after: updated,
        })
        return reply.send({ success: true, data: updated.toJSON() })
      } catch (error) {
        return handleProposalError(error, reply)
      }
    }
  )

  app.get(
    '/api/v1/proposals/:id/checklist',
    { preHandler: [requireAbility('read', 'Proposal')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = idParamSchema.parse(request.params)
      const useCase = container.resolve(ListChecklistItems)
      try {
        const result = await useCase.execute(id, request.organizationId!)
        return reply.send({ success: true, data: result })
      } catch (error) {
        return handleProposalError(error, reply)
      }
    }
  )

  app.post(
    '/api/v1/proposals/:id/checklist/:itemId/complete',
    { preHandler: [requireAbility('update', 'Proposal')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id, itemId } = checklistItemIdParamSchema.parse(request.params)
      const useCase = container.resolve(CompleteChecklistByAttachment)
      try {
        const item = await useCase.execute(
          itemId,
          id,
          request.organizationId!,
          request.user!.id
        )
        return reply.send({ success: true, data: item })
      } catch (error) {
        return handleProposalError(error, reply)
      }
    }
  )
}
