import type { Auth } from '@repo/auth'
import type { AuthUser } from '@repo/auth/types'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { userStatus } from '../lib/workspace-queries.js'

export function createAuthMiddleware(auth: Auth) {
  return async function authMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const headers: Record<string, string> = {}
    for (const [key, value] of Object.entries(request.headers)) {
      if (typeof value === 'string') {
        headers[key] = value
      } else if (Array.isArray(value)) {
        headers[key] = value.join(', ')
      }
    }
    const session = await auth.api.getSession({
      headers,
    })
    if (!session) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      })
    }
    const { user: sessionUser } = session
    const isSuperAdmin = await userStatus.isSuperAdmin(sessionUser.id)
    const user: AuthUser = {
      id: sessionUser.id,
      email: sessionUser.email,
      name: sessionUser.name,
      emailVerified: sessionUser.emailVerified,
      image: sessionUser.image,
      isSuperAdmin,
    }
    request.user = user
    request.session = session.session
  }
}
export function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
  done: () => void
) {
  if (!request.user) {
    return reply.status(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    })
  }
  done()
}
