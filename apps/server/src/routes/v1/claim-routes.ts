import {
  ClaimNotFoundError,
  CreateClaim,
  CreateOccurrence,
  DeleteClaim,
  GetClaim,
  InvalidClaimStatusTransitionError,
  ListClaims,
  ListOccurrences,
  OccurrenceClaimNotFoundError,
  UpdateClaimStatus,
  claimOpenedEmail,
  container,
} from '@repo/core'
import { prisma } from '@repo/db'
import { env } from '@repo/env'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { requireAbility } from '../../middlewares/ability-middleware.js'
import { tenantMiddleware } from '../../middlewares/tenant-middleware.js'
import {
  createClaimBodySchema,
  listClaimsQuerySchema,
  updateClaimStatusBodySchema,
} from '../../schemas/claim.schemas.js'
import { idParamSchema } from '../../schemas/client.schemas.js'
import { createOccurrenceBodySchema } from '../../schemas/occurrence.schemas.js'
import {
  auditCreate,
  auditUpdate,
  auditDelete,
} from '../../services/audit-logger.js'
import { enqueueNotifications } from '../../services/notification-enqueuer.js'

function handleClaimError(error: unknown, reply: FastifyReply) {
  if (error instanceof ClaimNotFoundError) {
    return reply.status(404).send({
      success: false,
      error: { code: error.code, message: error.message },
    })
  }
  if (error instanceof InvalidClaimStatusTransitionError) {
    return reply.status(422).send({
      success: false,
      error: { code: error.code, message: error.message },
    })
  }
  if (error instanceof OccurrenceClaimNotFoundError) {
    return reply.status(404).send({
      success: false,
      error: { code: error.code, message: error.message },
    })
  }
  throw error
}

export async function claimRoutes(app: FastifyInstance) {
  app.addHook('preHandler', tenantMiddleware)

  app.post(
    '/api/v1/claims',
    { preHandler: [requireAbility('create', 'Claim')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = createClaimBodySchema.parse(request.body)
      const useCase = container.resolve(CreateClaim)
      try {
        const claim = await useCase.execute({
          organizationId: request.organizationId!,
          ...body,
        })

        // Notify ADMIN + MANAGER about new claim
        const managers = await prisma.member.findMany({
          where: {
            organizationId: request.organizationId!,
            role: { in: ['ADMIN', 'MANAGER', 'OWNER'] },
          },
          include: { user: true },
        })
        const frontendUrl = env.FRONTEND_URL
        const notifItems = managers
          .filter((m) => m.userId !== request.user!.id)
          .map((m) => ({
            notification: {
              organizationId: request.organizationId!,
              userId: m.userId,
              type: 'CLAIM_OPENED',
              title: 'Novo sinistro aberto',
              body: `Sinistro #${String(claim.claimNumber)} aberto`,
              entityType: 'Claim',
              entityId: claim.id,
            },
            email: m.user.email
              ? {
                  to: m.user.email,
                  subject: `Novo sinistro #${String(claim.claimNumber)}`,
                  html: claimOpenedEmail({
                    userName: m.user.name,
                    claimNumber: String(claim.claimNumber),
                    clientName: 'N/A',
                    priority: String(claim.priority ?? 'NORMAL'),
                    frontendUrl,
                  }),
                }
              : undefined,
          }))
        if (notifItems.length > 0) {
          enqueueNotifications(notifItems).catch((err: unknown) => {
            request.log.error({ err }, 'Failed to enqueue claim notifications')
          })
        }

        auditCreate({
          request,
          entityType: 'Claim',
          entityId: claim.id,
          after: claim,
        })
        return reply.status(201).send({ success: true, data: claim })
      } catch (error) {
        return handleClaimError(error, reply)
      }
    }
  )

  app.get(
    '/api/v1/claims',
    { preHandler: [requireAbility('read', 'Claim')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = listClaimsQuerySchema.parse(request.query)
      const useCase = container.resolve(ListClaims)
      const { limit, cursor, ...filters } = query
      const result = await useCase.execute(
        { organizationId: request.organizationId!, ...filters },
        { limit, cursor }
      )
      return reply.send({
        success: true,
        data: result.items,
        meta: { total: result.total, nextCursor: result.nextCursor },
      })
    }
  )

  app.get(
    '/api/v1/claims/:id',
    { preHandler: [requireAbility('read', 'Claim')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = idParamSchema.parse(request.params)
      const useCase = container.resolve(GetClaim)
      try {
        const claim = await useCase.execute(id, request.organizationId!)
        return reply.send({ success: true, data: claim })
      } catch (error) {
        return handleClaimError(error, reply)
      }
    }
  )

  app.post(
    '/api/v1/claims/:id/status',
    { preHandler: [requireAbility('update', 'Claim')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = idParamSchema.parse(request.params)
      const { status } = updateClaimStatusBodySchema.parse(request.body)
      const useCase = container.resolve(UpdateClaimStatus)
      try {
        const claim = await useCase.execute(id, request.organizationId!, status)
        auditUpdate({
          request,
          entityType: 'Claim',
          entityId: id,
          after: { status: claim.status },
        })
        return reply.send({ success: true, data: claim })
      } catch (error) {
        return handleClaimError(error, reply)
      }
    }
  )

  app.delete(
    '/api/v1/claims/:id',
    { preHandler: [requireAbility('delete', 'Claim')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = idParamSchema.parse(request.params)
      const useCase = container.resolve(DeleteClaim)
      try {
        await useCase.execute(id, request.organizationId!)
        auditDelete({ request, entityType: 'Claim', entityId: id })
        return reply.status(204).send()
      } catch (error) {
        return handleClaimError(error, reply)
      }
    }
  )

  registerOccurrenceSubRoutes(app)
}

function registerOccurrenceSubRoutes(app: FastifyInstance) {
  app.post(
    '/api/v1/claims/:id/occurrences',
    { preHandler: [requireAbility('update', 'Claim')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = idParamSchema.parse(request.params)
      const body = createOccurrenceBodySchema.parse(request.body)
      const useCase = container.resolve(CreateOccurrence)
      try {
        const occurrence = await useCase.execute({
          claimId: id,
          createdBy: request.user!.id,
          ...body,
        })
        return reply.status(201).send({ success: true, data: occurrence })
      } catch (error) {
        return handleClaimError(error, reply)
      }
    }
  )

  app.get(
    '/api/v1/claims/:id/occurrences',
    { preHandler: [requireAbility('read', 'Claim')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = idParamSchema.parse(request.params)
      const useCase = container.resolve(ListOccurrences)
      const occurrences = await useCase.execute(id)
      return reply.send({ success: true, data: occurrences })
    }
  )
}
