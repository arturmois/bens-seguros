import { prisma } from '@repo/db';

interface AuditEntry {
  organizationId: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  await prisma.auditLog.create({ data: entry });
}

export function logCreate(base: Omit<AuditEntry, 'action'>): Promise<void> {
  return logAudit({ ...base, action: 'CREATE' });
}

export function logUpdate(base: Omit<AuditEntry, 'action'>): Promise<void> {
  return logAudit({ ...base, action: 'UPDATE' });
}

export function logDelete(base: Omit<AuditEntry, 'action'>): Promise<void> {
  return logAudit({ ...base, action: 'DELETE' });
}

export function logApprove(base: Omit<AuditEntry, 'action'>): Promise<void> {
  return logAudit({ ...base, action: 'APPROVE' });
}

export function logReject(base: Omit<AuditEntry, 'action'>): Promise<void> {
  return logAudit({ ...base, action: 'REJECT' });
}
