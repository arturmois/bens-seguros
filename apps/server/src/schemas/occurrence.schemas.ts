import { z } from 'zod'
import { jsonObjectSchema } from './shared.js'

export const createOccurrenceBodySchema = z.object({
  type: z.string().min(1),
  description: z.string().min(1),
  metadata: jsonObjectSchema.optional(),
})
