import type { AuditLog, Prisma, PrismaClient } from '@repo/db'
import { inject, injectable } from 'tsyringe'
import type { CursorPage } from '../../../shared/pagination.js'
import type {
  AuditLogData,
  AuditLogFilters,
  AuditLogPage,
  AuditLogRepository,
  AuditLogSortField,
} from '../domain/audit-log-repository.js'

@injectable()
export class PrismaAuditLogRepository implements AuditLogRepository {
  constructor(@inject('PrismaClient') private readonly prisma: PrismaClient) {}

  async list(
    filters: AuditLogFilters,
    page: CursorPage<AuditLogSortField>
  ): Promise<AuditLogPage> {
    const where = this.buildWhere(filters)
    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: page.limit + 1,
        ...(page.cursor ? { cursor: { id: page.cursor }, skip: 1 } : {}),
      }),
      this.prisma.auditLog.count({ where }),
    ])
    const hasMore = rows.length > page.limit
    if (hasMore) rows.pop()
    const nextCursor = hasMore ? (rows.at(-1)?.id ?? null) : null
    return {
      items: rows.map((row) => this.toDomain(row)),
      total,
      nextCursor,
    }
  }

  private buildWhere(filters: AuditLogFilters): Prisma.AuditLogWhereInput {
    return {
      organizationId: filters.organizationId,
      ...(filters.entityTypeIn?.length
        ? { entityType: { in: [...filters.entityTypeIn] } }
        : filters.entityType && { entityType: filters.entityType }),
      ...(filters.actionIn?.length
        ? { action: { in: [...filters.actionIn] } }
        : filters.action && { action: filters.action }),
      ...(filters.userId ? { userId: filters.userId } : {}),
      ...(filters.dateFrom || filters.dateTo
        ? {
            createdAt: {
              ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
              ...(filters.dateTo ? { lte: filters.dateTo } : {}),
            },
          }
        : {}),
    }
  }

  private toDomain(row: AuditLog): AuditLogData {
    return {
      id: row.id,
      organizationId: row.organizationId,
      userId: row.userId,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      before: row.before,
      after: row.after,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      createdAt: row.createdAt,
    }
  }
}
