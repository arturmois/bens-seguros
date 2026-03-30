import { container, ExportPoliciesCsv } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { listPoliciesQuery } from './_schemas.js'

export function exportPoliciesRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/api/v1/policies/export',
    schema: {
      tags: ['Policies'],
      summary: 'Export policies as CSV',
      operationId: 'exportPolicies',
      querystring: listPoliciesQuery,
    },
    preHandler: [requireAbility('read', 'Policy')],
    handler: async (request, reply) => {
      const { status, clientId, proposalId, branch, search } = request.query
      const useCase = container.resolve(ExportPoliciesCsv)
      const stream = useCase.generateCsvRows({
        organizationId: request.organizationId!,
        status,
        clientId,
        proposalId,
        branch,
        search,
      })

      reply.raw.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="apolices.csv"',
        'Transfer-Encoding': 'chunked',
      })

      for await (const chunk of stream) {
        reply.raw.write(chunk)
      }

      reply.raw.end()
      return reply
    },
  })
}
