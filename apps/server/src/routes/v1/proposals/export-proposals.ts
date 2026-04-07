import { container, ExportProposalsCsv } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { Readable } from 'node:stream'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { listProposalsQuery } from './_schemas.js'

export function exportProposalsRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/api/v1/proposals/export',
    schema: {
      tags: ['Proposals'],
      summary: 'Export proposals as CSV',
      operationId: 'exportProposals',
      querystring: listProposalsQuery,
    },
    preHandler: [requireAbility('read', 'Proposal')],
    handler: async (request, reply) => {
      const {
        stage,
        clientId,
        salespersonId,
        insurerId,
        sourcePolicyId,
        createdFrom,
        createdTo,
        boardType,
        search,
      } = request.query
      const useCase = container.resolve(ExportProposalsCsv)
      const stream = useCase.generateCsvRows({
        organizationId: request.organizationId!,
        stage,
        clientId,
        salespersonId,
        insurerId,
        sourcePolicyId,
        createdFrom,
        createdTo,
        boardType,
        search,
      })

      const readable = Readable.from(stream)

      return reply
        .header('Content-Type', 'text/csv; charset=utf-8')
        .header('Content-Disposition', 'attachment; filename="propostas.csv"')
        .send(readable)
    },
  })
}
