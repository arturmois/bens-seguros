import { z } from 'zod'

export const listNotificationsQuerySchema = z.object({
  read: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const notificationIdParamSchema = z.object({
  id: z.string().min(1),
})
