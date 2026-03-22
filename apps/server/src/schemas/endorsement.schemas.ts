import { z } from 'zod'
import { jsonObjectSchema } from './shared.js'

export const createEndorsementBodySchema = z.object({
  policyId: z.string().min(1),
  type: z.string().min(1),
  description: z.string().min(1),
  effectiveDate: z.coerce.date(),
  previousVersionSnapshot: jsonObjectSchema,
  changes: jsonObjectSchema,
})

export const listEndorsementsQuerySchema = z.object({
  policyId: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
})
