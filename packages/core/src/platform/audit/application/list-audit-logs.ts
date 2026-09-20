import { inject, injectable } from 'tsyringe'
import type { CursorPage } from '../../../shared/pagination.js'
import type {
  AuditLogFilters,
  AuditLogPage,
  AuditLogRepository,
  AuditLogSortField,
} from '../domain/audit-log-repository.js'

@injectable()
export class ListAuditLogs {
  constructor(
    @inject('AuditLogRepository')
    private readonly auditLogRepo: AuditLogRepository
  ) {}

  async execute(
    filters: AuditLogFilters,
    page: CursorPage<AuditLogSortField>
  ): Promise<AuditLogPage> {
    return this.auditLogRepo.list(filters, page)
  }
}
