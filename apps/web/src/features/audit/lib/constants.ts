import type { ListAuditLogs200DataItem } from '@/api/model'

export type AuditLogEntry = ListAuditLogs200DataItem

export interface AuditLogFilters {
  entityType?: string
  action?: string
  userId?: string
  dateFrom?: string
  dateTo?: string
  cursor?: string
  limit?: number
}
