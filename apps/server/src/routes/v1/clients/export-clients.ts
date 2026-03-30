import { container, ExportClientsCsv } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { listClientsQuerySchema } from './_schemas.js'

export function exportClientsRoute(app: FastifyInstance) {
  // IMPORTANT: export route must be registered BEFORE /:id to avoid route conflict
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
      const { type, search } = request.query
      const useCase = container.resolve(ExportClientsCsv)
      const stream = useCase.generateCsvRows({
        organizationId: request.organizationId!,
        type,
        search,
      })

      reply.raw.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="clientes.csv"',
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
