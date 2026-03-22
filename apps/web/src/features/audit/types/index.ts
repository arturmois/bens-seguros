export interface AuditLogEntry {
  id: string;
  organizationId: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditLogFilters {
  entityType?: string;
  action?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  cursor?: string;
  limit?: number;
}
