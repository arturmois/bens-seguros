import { z } from 'zod'

export const searchQuerySchema = z.object({
  q: z.string().min(2).max(100),
  limit: z.coerce.number().int().min(1).max(20).default(10),
})

export type SearchQuery = z.infer<typeof searchQuerySchema>
