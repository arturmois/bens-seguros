import type { ClientsApi } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { Readable } from 'node:stream'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { listClientsQuerySchema } from './_schemas.js'

export function exportClientsRoute(app: FastifyInstance, clients: ClientsApi) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/api/v1/clients/export',
    schema: {
      tags: ['Clients'],
      summary: 'Export clients as CSV',
      operationId: 'exportClients',
      querystring: listClientsQuerySchema,
    },
    preHandler: [requireAbility('read', 'Client')],
    handler: async (request, reply) => {
      const { hasActivePolicy, personTypeIn, search } = request.query
      const csvGenerator = clients.exportClientsCsv.generateCsvRows({
        organizationId: request.organizationId!,
        hasActivePolicy,
        personTypeIn,
        search,
      })
      const readable = Readable.from(csvGenerator)
      return reply
        .header('Content-Type', 'text/csv; charset=utf-8')
        .header('Content-Disposition', 'attachment; filename="clientes.csv"')
        .send(readable)
    },
  })
}
