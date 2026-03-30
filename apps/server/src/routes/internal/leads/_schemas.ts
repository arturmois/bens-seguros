import { z } from 'zod'

export const createLeadBodySchema = z.object({
  clientName: z.string().min(1),
  clientPhone: z.string().min(1),
  insuranceType: z.string(),
  notes: z.string().optional(),
  source: z.string().optional(),
})
