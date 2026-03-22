import {
  logCreate,
  logUpdate,
  logDelete,
  logApprove,
  logReject,
} from '@repo/core'
import type { FastifyRequest } from 'fastify'
import type { Prisma } from '@repo/db'

interface AuditContext {
  readonly request: FastifyRequest
  readonly entityType: string
  readonly entityId?: string
  readonly before?: Prisma.InputJsonValue
  readonly after?: Prisma.InputJsonValue
}

function extractMeta(request: FastifyRequest) {
  return {
    organizationId: request.organizationId!,
    userId: request.user?.id,
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'] ?? undefined,
  }
}

// logAudit already has its own try/catch with Pino logging.
// The fire-and-forget pattern here is intentional — audit
// failures must never break the main request flow.

export function auditCreate(ctx: AuditContext): void {
  logCreate({
    ...extractMeta(ctx.request),
    entityType: ctx.entityType,
    entityId: ctx.entityId,
    after: ctx.after,
  })
}

export function auditUpdate(ctx: AuditContext): void {
  logUpdate({
    ...extractMeta(ctx.request),
    entityType: ctx.entityType,
    entityId: ctx.entityId,
    before: ctx.before,
    after: ctx.after,
  })
}

export function auditDelete(ctx: AuditContext): void {
  logDelete({
    ...extractMeta(ctx.request),
    entityType: ctx.entityType,
    entityId: ctx.entityId,
    before: ctx.before,
  })
}

export function auditApprove(ctx: AuditContext): void {
  logApprove({
    ...extractMeta(ctx.request),
    entityType: ctx.entityType,
    entityId: ctx.entityId,
    after: ctx.after,
  })
}

export function auditReject(ctx: AuditContext): void {
  logReject({
    ...extractMeta(ctx.request),
    entityType: ctx.entityType,
    entityId: ctx.entityId,
    after: ctx.after,
  })
}
