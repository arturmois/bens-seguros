import { container, IssuePolicy } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { auditCreate } from '../../../services/audit-logger.js'
import { handleDomainError } from '../handle-domain-error.js'
import { issuePolicyBody } from './_schemas.js'

export function issuePolicyRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/api/v1/policies',
    schema: {
      tags: ['Policies'],
      summary: 'Issue a new policy from a proposal',
      operationId: 'issuePolicy',
      body: issuePolicyBody,
    },
    preHandler: [requireAbility('create', 'Policy')],
    handler: async (request, reply) => {
      const useCase = container.resolve(IssuePolicy)
      try {
        const { coverageDetails, ...rest } = request.body
        const policy = await useCase.execute({
          organizationId: request.organizationId!,
          ...rest,
          coverageDetails: coverageDetails
            ? JSON.parse(JSON.stringify(coverageDetails))
            : undefined,
        })
        auditCreate({
          request,
          entityType: 'Policy',
          entityId: policy.id,
          after: policy,
        })
        return reply.status(201).send({ success: true, data: policy })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
