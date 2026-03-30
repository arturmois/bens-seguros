import { z } from 'zod'

import { successResponse } from '../../_shared/response.schema.js'

const emptyToUndefined = z.literal('').transform(() => undefined)

const optionalString = z.union([emptyToUndefined, z.string()]).optional()

export const createInsurerBodySchema = z.object({
  name: z.string().min(1),
  code: optionalString,
})

export const listInsurersQuerySchema = z.object({
  active: z.coerce.boolean().optional(),
  search: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
})

// --- Response schemas ---

const insurerSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  code: z.string().nullable(),
  active: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export const insurerDetailResponse = successResponse(insurerSchema)

export const insurerListResponse = z.object({
  success: z.literal(true),
  data: z.array(insurerSchema),
  meta: z.object({
    nextCursor: z.string().nullable().optional(),
  }),
})
