import {
  logApprove,
  logCreate,
  logDelete,
  logReject,
  logUpdate,
} from '@repo/core'
import type { Prisma } from '@repo/db'
import type { FastifyRequest } from 'fastify'

interface AuditContext {
  readonly request: FastifyRequest
  readonly entityType: string
  readonly entityId?: string
  readonly before?: unknown
  readonly after?: unknown
}

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined
  try {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
  } catch {
    return { _error: 'Could not serialize audit data' }
  }
}

function extractMeta(request: FastifyRequest) {
  // organizationId guaranteed by tenantMiddleware preHandler
  return {
    organizationId: request.organizationId!,
    userId: request.user?.id,
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'] ?? undefined,
  }
}

// logAudit already has its own try/catch with Pino logging.
// The .catch() safety net prevents unhandled rejections if
// toJson or extractMeta throw before reaching logAudit.

export function auditCreate(ctx: AuditContext): void {
  logCreate({
    ...extractMeta(ctx.request),
    entityType: ctx.entityType,
    entityId: ctx.entityId,
    after: toJson(ctx.after),
  }).catch((err: unknown) => {
    ctx.request.log.warn(
      { err, ctx: 'audit-create' },
      'Audit logging failed (non-critical)'
    )
  })
}

export function auditUpdate(ctx: AuditContext): void {
  logUpdate({
    ...extractMeta(ctx.request),
    entityType: ctx.entityType,
    entityId: ctx.entityId,
    before: toJson(ctx.before),
    after: toJson(ctx.after),
  }).catch((err: unknown) => {
    ctx.request.log.warn(
      { err, ctx: 'audit-update' },
      'Audit logging failed (non-critical)'
    )
  })
}

export function auditDelete(ctx: AuditContext): void {
  logDelete({
    ...extractMeta(ctx.request),
    entityType: ctx.entityType,
    entityId: ctx.entityId,
    before: toJson(ctx.before),
  }).catch((err: unknown) => {
    ctx.request.log.warn(
      { err, ctx: 'audit-delete' },
      'Audit logging failed (non-critical)'
    )
  })
}

export function auditApprove(ctx: AuditContext): void {
  logApprove({
    ...extractMeta(ctx.request),
    entityType: ctx.entityType,
    entityId: ctx.entityId,
    after: toJson(ctx.after),
  }).catch((err: unknown) => {
    ctx.request.log.warn(
      { err, ctx: 'audit-approve' },
      'Audit logging failed (non-critical)'
    )
  })
}

export function auditReject(ctx: AuditContext): void {
  logReject({
    ...extractMeta(ctx.request),
    entityType: ctx.entityType,
    entityId: ctx.entityId,
    after: toJson(ctx.after),
  }).catch((err: unknown) => {
    ctx.request.log.warn(
      { err, ctx: 'audit-reject' },
      'Audit logging failed (non-critical)'
    )
  })
}
