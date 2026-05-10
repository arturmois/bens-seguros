import { z } from 'zod'

import { successResponse } from '../../shared/response.schema.js'

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

const notificationSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  userId: z.string(),
  type: z.string(),
  title: z.string(),
  body: z.string(),
  entityType: z.string().nullable(),
  entityId: z.string().nullable(),
  read: z.boolean(),
  readAt: z.coerce.date().nullable(),
  emailSent: z.boolean(),
  createdAt: z.coerce.date(),
})

export const notificationListResponse = z.object({
  success: z.literal(true),
  data: z.array(notificationSchema),
  meta: z.object({
    nextCursor: z.string().nullable(),
  }),
})

export const unreadCountResponse = successResponse(
  z.object({ count: z.number() })
)

export const alertCountsResponse = successResponse(
  z.record(z.string(), z.number())
)

export const markAsReadResponse = successResponse(z.null())

export const markAllAsReadResponse = successResponse(
  z.object({ count: z.number() })
)
