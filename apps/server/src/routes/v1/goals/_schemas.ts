import { z } from 'zod'

import { successResponse } from '../../shared/response.schema.js'

const boardTypeEnum = z.enum(['NEW_INSURANCE', 'RENEWAL'])

export const goalYearParamSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
})

export const goalsProgressQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
})

export const upsertGoalEntrySchema = z.object({
  month: z.number().int().min(1).max(12),
  boardType: boardTypeEnum,
  targetPremiumCents: z.number().int().min(0),
})

export const upsertGoalsByYearBodySchema = z.object({
  entries: z.array(upsertGoalEntrySchema).max(24),
})

const goalProgressEntrySchema = z.object({
  month: z.number().int().min(1).max(12),
  boardType: boardTypeEnum,
  targetPremiumCents: z.number().int().min(0),
  realizedPremiumCents: z.number().int().min(0),
})

const goalsProgressDataSchema = z.object({
  year: z.number().int(),
  entries: z.array(goalProgressEntrySchema),
})

export const goalsProgressResponse = successResponse(goalsProgressDataSchema)

export const goalsUpsertResponse = successResponse(
  z.object({ count: z.number().int().min(0) })
)
