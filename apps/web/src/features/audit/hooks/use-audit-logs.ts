'use client'

import { useListAuditLogs } from '@/api/endpoints/audit-logs/audit-logs'

import type { AuditLogFilters, AuditLogsQueryData } from '../lib/types'

export function useAuditLogs(filters: AuditLogFilters) {
  const params = {
    entityType: filters.entityType,
    action: filters.action,
    userId: filters.userId,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    cursor: filters.cursor,
    limit: filters.limit ?? 30,
  }

  return useListAuditLogs<AuditLogsQueryData>(params, {
    query: {
      staleTime: 30_000,
      select: (response) => ({
        data: response.data.data,
        meta: response.data.meta,
      }),
    },
  })
}
