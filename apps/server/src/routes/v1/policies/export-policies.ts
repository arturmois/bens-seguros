import { container, ExportPoliciesCsv } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { Readable } from 'node:stream'
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
      const {
        status,
        statusIn,
        clientId,
        proposalId,
        branch,
        branchIn,
        boardType,
        boardTypeIn,
        createdFrom,
        createdTo,
        endDateFrom,
        endDateTo,
        search,
      } = request.query
      const useCase = container.resolve(ExportPoliciesCsv)
      const stream = useCase.generateCsvRows({
        organizationId: request.organizationId!,
        status,
        statusIn,
        clientId,
        proposalId,
        branch,
        branchIn,
        boardType,
        boardTypeIn,
        createdFrom,
        createdTo,
        endDateFrom,
        endDateTo,
        search,
      })

      const readable = Readable.from(stream)

      return reply
        .header('Content-Type', 'text/csv; charset=utf-8')
        .header('Content-Disposition', 'attachment; filename="apolices.csv"')
        .send(readable)
    },
  })
}
