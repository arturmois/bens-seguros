import { prismaAdmin } from '@repo/db'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { invoiceListResponse, listInvoicesQuery } from './_schemas.js'

export function listBillingInvoicesRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/api/v1/billing/invoices',
    schema: {
      operationId: 'listBillingInvoices',
      tags: ['Billing'],
      summary: 'List invoices for the active org (cursor pagination)',
      querystring: listInvoicesQuery,
      response: { 200: invoiceListResponse },
    },
    preHandler: [requireAbility('read', 'Organization')],
    handler: async (request, reply) => {
      const organizationId = request.organizationId ?? ''
      const { cursor, limit } = request.query

      const rows = await prismaAdmin.invoice.findMany({
        where: { organizationId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        select: {
          id: true,
          status: true,
          amountCents: true,
          baseAmountCents: true,
          overageAmountCents: true,
          dueDate: true,
          paidAt: true,
          periodStart: true,
          periodEnd: true,
          paymentMethod: true,
          invoiceUrl: true,
          receiptUrl: true,
          createdAt: true,
        },
      })

      const hasMore = rows.length > limit
      const items = hasMore ? rows.slice(0, limit) : rows
      const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null

      return reply.send({
        success: true,
        data: items.map((row) => ({
          id: row.id,
          status: row.status,
          amountCents: row.amountCents,
          baseAmountCents: row.baseAmountCents,
          overageAmountCents: row.overageAmountCents,
          dueDate: row.dueDate.toISOString(),
          paidAt: row.paidAt?.toISOString() ?? null,
          periodStart: row.periodStart.toISOString(),
          periodEnd: row.periodEnd.toISOString(),
          paymentMethod: row.paymentMethod,
          invoiceUrl: row.invoiceUrl,
          receiptUrl: row.receiptUrl,
          createdAt: row.createdAt.toISOString(),
        })),
        meta: { nextCursor },
      })
    },
  })
}
