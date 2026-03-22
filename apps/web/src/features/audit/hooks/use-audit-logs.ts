'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api-client';

import type { AuditLogEntry, AuditLogFilters } from '../types';

const AUDIT_LOGS_KEY = 'audit-logs';

function buildAuditUrl(filters: AuditLogFilters): string {
  const params = new URLSearchParams();
  if (filters.entityType) params.set('entityType', filters.entityType);
  if (filters.action) params.set('action', filters.action);
  if (filters.userId) params.set('userId', filters.userId);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.cursor) params.set('cursor', filters.cursor);
  params.set('limit', String(filters.limit ?? 30));
  return `/api/v1/audit-logs?${params.toString()}`;
}

export function useAuditLogs(filters: AuditLogFilters) {
  return useQuery({
    queryKey: [AUDIT_LOGS_KEY, filters],
    queryFn: async () => {
      const response = await api.get<AuditLogEntry[]>(buildAuditUrl(filters));
      return {
        data: response.data,
        meta: response.meta as { total: number; nextCursor: string | null },
      };
    },
    staleTime: 30_000,
  });
}
