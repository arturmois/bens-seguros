import { z } from 'zod'

export function successResponse<T extends z.ZodType>(dataSchema: T) {
  return z.object({ success: z.literal(true), data: dataSchema })
}

export function paginatedResponse<T extends z.ZodType>(itemSchema: T) {
  return z.object({
    success: z.literal(true),
    data: z.array(itemSchema),
    meta: z.object({
      total: z.number(),
      nextCursor: z.string().nullable(),
    }),
  })
}

export const errorResponse = z.object({
  success: z.literal(false),
  error: z.object({ code: z.string(), message: z.string() }),
})
