'use client'

import { useListAuditLogs } from '@/api/endpoints/audit-logs/audit-logs'
import type { ListAuditLogsParams } from '@/api/model'

interface UseEntityAuditLogsArgs
  extends Omit<ListAuditLogsParams, 'entityType' | 'entityId'> {
  readonly entityType: string
  readonly entityId: string
}

export function useEntityAuditLogs({
  entityType,
  entityId,
  limit = 10,
  ...rest
}: UseEntityAuditLogsArgs) {
  return useListAuditLogs(
    { entityType, entityId, limit, ...rest },
    {
      query: {
        enabled: Boolean(entityId),
        select: (response) => ({
          data: response.data.data,
          meta: response.data.meta,
        }),
      },
    }
  )
}
