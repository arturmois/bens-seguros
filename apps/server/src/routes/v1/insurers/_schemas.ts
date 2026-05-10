import { z } from 'zod'

import { idParam } from '../../shared/params.schema.js'
import { successResponse } from '../../shared/response.schema.js'

const emptyToUndefined = z.literal('').transform(() => undefined)

const optionalString = z.union([emptyToUndefined, z.string()]).optional()

export const createInsurerBodySchema = z.object({
  name: z.string().min(1),
  code: optionalString,
})

export const updateInsurerBodySchema = z.object({
  name: z.string().min(1),
  code: optionalString,
  active: z.boolean(),
})

export const insurerSortByEnum = z.enum(['name', 'code', 'active', 'updatedAt'])

export const listInsurersQuerySchema = z.object({
  active: z
    .union([z.literal('true'), z.literal('false')])
    .transform((v) => v === 'true')
    .optional(),
  search: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: insurerSortByEnum.optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
})

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

export { idParam as idParamSchema }
