import { z } from 'zod'

export function paginationQuery(defaultLimit = 20, maxLimit = 100) {
  return z.object({
    cursor: z.string().optional(),
    limit: z.coerce.number().min(1).max(maxLimit).default(defaultLimit),
  })
}
