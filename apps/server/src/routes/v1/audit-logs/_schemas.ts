import { z } from 'zod'

import { csvEnumArray } from '../../shared/csv-array.schema.js'
import { paginatedResponse } from '../../shared/response.schema.js'

export const listAuditLogsQuerySchema = z.object({
  entityType: z.string().optional(),
  entityTypeIn: csvEnumArray(z.string().min(1)).optional(),
  action: z.string().optional(),
  actionIn: csvEnumArray(z.string().min(1)).optional(),
  userId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(30),
})

const auditLogSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  userId: z.string().nullable(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string().nullable(),
  before: z.unknown().nullable(),
  after: z.unknown().nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: z.coerce.date(),
})

export const auditLogListResponse = paginatedResponse(auditLogSchema)
