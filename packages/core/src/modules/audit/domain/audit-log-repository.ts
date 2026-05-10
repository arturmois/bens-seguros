import type { CursorPage, Page } from '../../../shared/pagination.js'

export interface AuditLogData {
  id: string
  organizationId: string
  userId: string | null
  action: string
  entityType: string
  entityId: string | null
  before: unknown
  after: unknown
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
}

export interface AuditLogFilters {
  organizationId: string
  entityType?: string
  entityTypeIn?: readonly string[]
  entityId?: string
  action?: string
  actionIn?: readonly string[]
  userId?: string
  dateFrom?: Date
  dateTo?: Date
}

export type AuditLogSortField = 'createdAt'

export interface AuditLogPage extends Page<AuditLogData> {
  total: number
}

export interface AuditLogRepository {
  list(
    filters: AuditLogFilters,
    page: CursorPage<AuditLogSortField>
  ): Promise<AuditLogPage>
}
