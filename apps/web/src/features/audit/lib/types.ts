import type {
  ListAuditLogs200DataItem,
  ListAuditLogs200Meta,
} from '@/api/model'

export type AuditLogData = ListAuditLogs200DataItem

export interface AuditLogFilters {
  readonly entityType?: string
  readonly action?: string
  readonly userId?: string
  readonly dateFrom?: string
  readonly dateTo?: string
  readonly cursor?: string
  readonly limit?: number
}

export interface AuditLogsQueryData {
  readonly data: ListAuditLogs200DataItem[]
  readonly meta: ListAuditLogs200Meta
}
