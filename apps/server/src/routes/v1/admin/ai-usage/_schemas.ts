import { z } from 'zod'
import { paginatedResponse } from '../../../shared/response.schema.js'

export const listAiUsageQuerySchema = z.object({
  organizationId: z.string().min(1),
  periodKey: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'periodKey must be YYYY-MM')
    .optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

const aiUsageItemSchema = z.object({
  organizationId: z.string(),
  periodKey: z.string(),
  channelIdHash: z.string().nullable(),
  conversationIdHash: z.string().nullable(),
  messageIdHash: z.string().nullable(),
  agentIdHash: z.string().nullable(),
  provider: z.string(),
  model: z.string(),
  inputQuantity: z.number().int(),
  outputQuantity: z.number().int(),
  unitType: z.enum(['TOKEN', 'CHARACTER', 'IMAGE']),
  inputCostMicrocents: z.number().int(),
  outputCostMicrocents: z.number().int(),
  countedAsIncluded: z.boolean().nullable(),
  overageCents: z.number().int().nullable(),
  createdAt: z.coerce.date(),
})

export const listAiUsageResponse = paginatedResponse(aiUsageItemSchema)
