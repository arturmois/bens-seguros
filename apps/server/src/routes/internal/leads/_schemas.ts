import { z } from 'zod'

import { successResponse } from '../../_shared/response.schema.js'

export const createLeadBodySchema = z.object({
  clientName: z.string().min(1),
  clientPhone: z.string().min(1),
  insuranceType: z.string(),
  notes: z.string().optional(),
  source: z.string().optional(),
})

// --- Response schemas ---

export const createLeadResponse = successResponse(
  z.object({
    proposalId: z.string(),
    clientId: z.string(),
    message: z.string(),
  })
)
