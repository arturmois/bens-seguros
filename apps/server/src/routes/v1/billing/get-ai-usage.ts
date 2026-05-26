import { prismaAdmin } from '@repo/db'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { aiUsageQuery, aiUsageResponse } from './_schemas.js'

interface DailyUsageRow {
  day: Date
  input_quantity: bigint | number | null
  output_quantity: bigint | number | null
  total_cost_microcents: bigint | number | null
  message_count: bigint | number | null
}

const MAX_SAFE_BIGINT = BigInt(Number.MAX_SAFE_INTEGER)

function toInt(value: bigint | number | null): number {
  if (value === null) return 0
  if (typeof value === 'bigint') {
    if (value > MAX_SAFE_BIGINT) {
      throw new Error('AI usage aggregate exceeds safe integer range')
    }
    return Number(value)
  }
  return value
}

export function getBillingAiUsageRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/api/v1/billing/ai-usage',
    schema: {
      operationId: 'getBillingAiUsage',
      tags: ['Billing'],
      summary: 'AI usage daily breakdown for the active org',
      querystring: aiUsageQuery,
      response: { 200: aiUsageResponse },
    },
    preHandler: [requireAbility('read', 'Organization')],
    handler: async (request, reply) => {
      const organizationId = request.organizationId ?? ''
      const { days } = request.query

      const periodEnd = new Date()
      const periodStart = new Date(periodEnd)
      periodStart.setUTCDate(periodStart.getUTCDate() - days)
      periodStart.setUTCHours(0, 0, 0, 0)

      // DATE_TRUNC runs in the session TimeZone setting; `createdAt` is
      // stored UTC and Postgres defaults to UTC, so day buckets align with
      // periodStart's UTC midnight calculation above.
      const rows = await prismaAdmin.$queryRaw<DailyUsageRow[]>`
        SELECT
          DATE_TRUNC('day', "createdAt") AS day,
          SUM("inputQuantity") AS input_quantity,
          SUM("outputQuantity") AS output_quantity,
          SUM("inputCostMicrocents" + "outputCostMicrocents") AS total_cost_microcents,
          COUNT(*) AS message_count
        FROM "AiUsageRecord"
        WHERE "organizationId" = ${organizationId}
          AND "createdAt" >= ${periodStart}
        GROUP BY day
        ORDER BY day ASC
      `

      const series = rows.map((row) => ({
        date: row.day.toISOString().slice(0, 10),
        inputTokens: toInt(row.input_quantity),
        outputTokens: toInt(row.output_quantity),
        totalCostMicrocents: toInt(row.total_cost_microcents),
        messageCount: toInt(row.message_count),
      }))

      const totals = series.reduce(
        (acc, row) => ({
          inputTokens: acc.inputTokens + row.inputTokens,
          outputTokens: acc.outputTokens + row.outputTokens,
          totalCostMicrocents:
            acc.totalCostMicrocents + row.totalCostMicrocents,
          messageCount: acc.messageCount + row.messageCount,
        }),
        {
          inputTokens: 0,
          outputTokens: 0,
          totalCostMicrocents: 0,
          messageCount: 0,
        }
      )

      return reply.send({
        success: true,
        data: {
          series,
          totals: {
            ...totals,
            periodStart: periodStart.toISOString(),
            periodEnd: periodEnd.toISOString(),
          },
        },
      })
    },
  })
}
