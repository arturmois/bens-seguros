import type { FastifyRequest, FastifyReply } from 'fastify'
import { env } from '@repo/env'
import { verifyRequest } from '@repo/shared'
import pino from 'pino'

const logger = pino({ name: 'internal-auth' })

function headerAsString(
  value: string | string[] | undefined
): string | undefined {
  if (typeof value === 'string') return value
  return undefined
}

export async function internalAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const signature = headerAsString(request.headers['x-signature'])
  const timestampHeader = headerAsString(request.headers['x-timestamp'])
  const tenantId = headerAsString(request.headers['x-tenant-id'])

  const secret = env.INTERNAL_API_SECRET

  if (!secret) {
    logger.error('INTERNAL_API_SECRET not configured')
    return reply.status(503).send({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Internal API not configured',
      },
    })
  }

  if (!signature || !timestampHeader || !tenantId) {
    return reply.status(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing signature, timestamp, or tenant ID',
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

  // Signer sends JSON.stringify(obj); Fastify parses it back to object.
  // Re-serializing produces identical output because both use simple flat objects.
  // For GET requests, body is undefined/null — use empty string to match signer.
  const rawBody =
    typeof request.body === 'string'
      ? request.body
      : request.body != null
        ? JSON.stringify(request.body)
        : ''

  const isValid = verifyRequest({
    secret,
    signature,
    method: request.method,
    path: request.url.split('?')[0] ?? request.url,
    tenantId,
    body: rawBody,
    timestamp,
  })

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

  request.organizationId = tenantId
}
