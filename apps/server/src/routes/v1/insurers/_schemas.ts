import { z } from 'zod'

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
