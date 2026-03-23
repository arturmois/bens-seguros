import { container, CreateProposal } from '@repo/core'
import { prisma } from '@repo/db'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { internalAuthMiddleware } from '../../middlewares/internal-auth-middleware.js'

const INSURANCE_TYPE_TO_BRANCH: Record<string, string> = {
  AUTO: 'AUTO',
  VIDA: 'LIFE',
  RESIDENCIAL: 'RESIDENTIAL',
  EMPRESARIAL: 'BUSINESS',
  VIAGEM: 'OTHER',
  OUTRO: 'OTHER',
}

const createLeadBodySchema = z.object({
  clientName: z.string().min(1),
  clientPhone: z.string().min(1),
  insuranceType: z.string(),
  notes: z.string().optional(),
  source: z.string().optional(),
})

export async function internalLeadRoutes(app: FastifyInstance) {
  app.addHook('preHandler', internalAuthMiddleware)

  app.post(
    '/api/internal/leads',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = createLeadBodySchema.parse(request.body)
      const organizationId = request.organizationId!

      const existing = await prisma.client.findFirst({
        where: {
          organizationId,
          phone: body.clientPhone,
          deletedAt: null,
        },
      })

      const client =
        existing ??
        (await prisma.client.create({
          data: {
            organizationId,
            name: body.clientName,
            document: `LEAD-${body.clientPhone}`,
            type: 'LEAD',
            phone: body.clientPhone,
          },
        }))

      const member = await prisma.member.findFirst({
        where: { organizationId, active: true },
        orderBy: { createdAt: 'asc' },
      })

      if (!member) {
        return reply.status(400).send({
          success: false,
          error: { code: 'NO_MEMBER', message: 'No active member in org' },
        })
      }

      const branch = INSURANCE_TYPE_TO_BRANCH[body.insuranceType] ?? 'OTHER'

      const useCase = container.resolve(CreateProposal)
      const proposal = await useCase.execute({
        organizationId,
        clientId: client.id,
        salespersonId: member.userId,
        branch: branch as
          | 'AUTO'
          | 'RESIDENTIAL'
          | 'CONDOMINIUM'
          | 'BUSINESS'
          | 'LIFE'
          | 'OTHER',
        boardType: 'NEW_INSURANCE',
      })

      return reply.status(201).send({
        success: true,
        data: {
          proposalId: proposal.id,
          clientId: client.id,
          message: `Lead registrado: ${body.clientName} - ${body.insuranceType}`,
        },
      })
    }
  )
}
