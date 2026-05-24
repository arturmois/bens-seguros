import { env } from '@repo/env'
import jwt from 'jsonwebtoken'
import type { Socket } from 'socket.io'
import { z } from 'zod'
import type { AppLogger } from '../logger.js'
import type { MembershipValidator } from './membership-validator.js'

const socketJwtPayloadSchema = z.object({
  userId: z.string(),
  organizationId: z.string(),
  role: z.enum(['OWNER', 'ADMIN', 'MANAGER', 'COMMERCIAL', 'VIEWER']),
  name: z.string(),
})

export interface SocketUserData {
  userId: string
  organizationId: string
  role: string
  name: string
}

export function createSocketAuthMiddleware(
  logger: AppLogger,
  membershipValidator: MembershipValidator
) {
  return async (socket: Socket, next: (err?: Error) => void): Promise<void> => {
    const token = socket.handshake.auth['token']
    if (typeof token !== 'string') {
      logger.warn('Socket connection rejected: missing token')
      next(new Error('Token de autenticação ausente'))
      return
    }

    let parsedPayload: z.infer<typeof socketJwtPayloadSchema>
    try {
      const decoded: unknown = jwt.verify(token, env.SOCKET_JWT_SECRET, {
        algorithms: ['HS256'],
      })
      const parsed = socketJwtPayloadSchema.safeParse(decoded)
      if (!parsed.success) {
        logger.warn('Socket connection rejected: invalid token payload')
        next(new Error('Token inválido'))
        return
      }
      parsedPayload = parsed.data
    } catch {
      logger.warn('Socket connection rejected: token verification failed')
      next(new Error('Token expirado ou inválido'))
      return
    }

    const isMember = await membershipValidator.validate(
      parsedPayload.organizationId,
      parsedPayload.userId
    )
    if (!isMember) {
      logger.warn(
        {
          userId: parsedPayload.userId,
          organizationId: parsedPayload.organizationId,
        },
        'Socket connection rejected: user is not an active member of the organization'
      )
      next(new Error('Usuário não é membro ativo desta organização'))
      return
    }

    const userData: SocketUserData = {
      userId: parsedPayload.userId,
      organizationId: parsedPayload.organizationId,
      role: parsedPayload.role,
      name: parsedPayload.name,
    }
    socket.data['user'] = userData
    next()
  }
}
