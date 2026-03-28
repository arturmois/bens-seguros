import { env } from '@repo/env'
import type { FastifyReply, FastifyRequest } from 'fastify'
import jwt from 'jsonwebtoken'
import { z } from 'zod'

const visitorTokenSchema = z.object({
  conversationId: z.string(),
  contactId: z.string(),
  channelId: z.string(),
  tenantId: z.string(),
})

export type VisitorTokenPayload = z.infer<typeof visitorTokenSchema>

export function signVisitorToken(payload: VisitorTokenPayload): string {
  return jwt.sign(payload, env.SOCKET_JWT_SECRET, { expiresIn: '24h' })
}

export async function widgetAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    await reply.status(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Token ausente' },
    })
    return
  }

  const token = authHeader.slice(7)

  try {
    const decoded: unknown = jwt.verify(token, env.SOCKET_JWT_SECRET)
    const parsed = visitorTokenSchema.safeParse(decoded)

    if (!parsed.success) {
      await reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Token inválido' },
      })
      return
    }

    request.visitorData = parsed.data
  } catch {
    await reply.status(401).send({
      success: false,
      error: { code: 'TOKEN_EXPIRED', message: 'Token expirado ou inválido' },
    })
  }
}
