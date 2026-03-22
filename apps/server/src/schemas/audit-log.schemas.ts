import { z } from 'zod'

export const listAuditLogsQuerySchema = z.object({
  entityType: z.string().optional(),
  action: z.string().optional(),
  userId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(30),
})
