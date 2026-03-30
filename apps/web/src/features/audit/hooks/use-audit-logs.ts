'use client'

import { useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api-client'
import { getListAuditLogsQueryKey } from '@/api/endpoints/audit-logs/audit-logs'

import type { AuditLogEntry, AuditLogFilters } from '../types'

function buildAuditParams(filters: AuditLogFilters) {
  return {
    entityType: filters.entityType,
    action: filters.action,
    userId: filters.userId,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    cursor: filters.cursor,
    limit: filters.limit ?? 30,
  }
}

export function useAuditLogs(filters: AuditLogFilters) {
  const params = buildAuditParams(filters)

  return useQuery({
    queryKey: getListAuditLogsQueryKey(params),
    queryFn: async () => {
      const qs = new URLSearchParams()
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          qs.set(key, String(value))
        }
      }
      const response = await api.get<AuditLogEntry[]>(
        `/api/v1/audit-logs?${qs.toString()}`
      )
      return {
        data: response.data,
        meta: response.meta as { total: number; nextCursor: string | null },
      }
    },
    staleTime: 30_000,
  })
}
