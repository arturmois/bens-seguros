import { prisma, Prisma } from '@repo/db'
import pino from 'pino'

const logger = pino({ name: 'audit' })

interface AuditEntry {
  organizationId: string
  userId?: string
  action: string
  entityType: string
  entityId?: string
  before?: Prisma.InputJsonValue
  after?: Prisma.InputJsonValue
  ipAddress?: string
  userAgent?: string
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({ data: entry })
  } catch (err: unknown) {
    logger.error({ err, entry }, 'Failed to write audit log')
  }
}

export function logCreate(base: Omit<AuditEntry, 'action'>): Promise<void> {
  return logAudit({ ...base, action: 'CREATE' })
}

export function logUpdate(base: Omit<AuditEntry, 'action'>): Promise<void> {
  return logAudit({ ...base, action: 'UPDATE' })
}

export function logDelete(base: Omit<AuditEntry, 'action'>): Promise<void> {
  return logAudit({ ...base, action: 'DELETE' })
}

export function logApprove(base: Omit<AuditEntry, 'action'>): Promise<void> {
  return logAudit({ ...base, action: 'APPROVE' })
}

export function logReject(base: Omit<AuditEntry, 'action'>): Promise<void> {
  return logAudit({ ...base, action: 'REJECT' })
}
