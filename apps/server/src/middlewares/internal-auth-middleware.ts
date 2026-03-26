import type { FastifyRequest, FastifyReply } from 'fastify'
import { env } from '@repo/env'
import { verifyRequest } from '@repo/shared'
import pino from 'pino'

const logger = pino({ name: 'internal-auth' })

export async function internalAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const signature = request.headers['x-signature'] as string | undefined
  const timestampHeader = request.headers['x-timestamp'] as string | undefined
  const tenantId = request.headers['x-tenant-id'] as string | undefined

  if (!env.INTERNAL_API_SECRET) {
    logger.error('INTERNAL_API_SECRET not configured')
    return reply.status(503).send({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Internal API not configured',
      },
    })
  }

  if (!signature || !timestampHeader) {
    return reply.status(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing signature or timestamp',
      },
    })
  }

  const timestamp = Number(timestampHeader)

  if (!Number.isFinite(timestamp)) {
    return reply.status(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid timestamp' },
    })
  }

  const rawBody =
    typeof request.body === 'string'
      ? request.body
      : JSON.stringify(request.body ?? '')

  const isValid = verifyRequest(
    env.INTERNAL_API_SECRET,
    signature,
    request.method,
    request.url.split('?')[0],
    rawBody,
    timestamp
  )

  if (!isValid) {
    logger.warn(
      { method: request.method, url: request.url },
      'Invalid internal API signature'
    )
    return reply.status(403).send({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Invalid or expired signature' },
    })
  }

  if (typeof tenantId !== 'string' || tenantId.length === 0) {
    return reply.status(400).send({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'X-Tenant-Id header required' },
    })
  }

  request.organizationId = tenantId
}
