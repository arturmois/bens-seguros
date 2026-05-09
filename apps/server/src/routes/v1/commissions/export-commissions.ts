import { container, ExportCommissionsCsv } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { Readable } from 'node:stream'

import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { listCommissionsQuery } from './_schemas.js'

export async function exportCommissionsRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/api/v1/commissions/export',
    schema: {
      tags: ['Commissions'],
      summary: 'Export commissions as CSV',
      operationId: 'exportCommissions',
      querystring: listCommissionsQuery,
    },
    preHandler: [requireAbility('read', 'Commission')],
    async handler(request, reply) {
      const {
        status,
        statusIn,
        salespersonId,
        policyId,
        search,
        dateFrom,
        dateTo,
      } = request.query
      const useCase = container.resolve(ExportCommissionsCsv)
      const stream = useCase.generateCsvRows({
        organizationId: request.organizationId!,
        status,
        statusIn,
        salespersonId,
        policyId,
        search,
        dateFrom,
        dateTo,
      })

      const readable = Readable.from(stream)

      return reply
        .header('Content-Type', 'text/csv; charset=utf-8')
        .header('Content-Disposition', 'attachment; filename="comissoes.csv"')
        .send(readable)
    },
  })
}
