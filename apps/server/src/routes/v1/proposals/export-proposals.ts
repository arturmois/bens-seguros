import { container, ExportProposalsCsv } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
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
      const { stage, clientId, boardType, search } = request.query
      const useCase = container.resolve(ExportProposalsCsv)
      const stream = useCase.generateCsvRows({
        organizationId: request.organizationId!,
        stage,
        clientId,
        boardType,
        search,
      })

      reply.raw.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="propostas.csv"',
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
