import type { FastifyReply, FastifyRequest } from 'fastify'
import { userStatus } from '../lib/workspace-queries.js'

// SE4a foundation: gates super-admin routes behind a 2FA-enrolled account.
// This middleware does NOT re-verify a TOTP code per request — Better Auth's
// two-factor plugin already gates login behind TOTP when twoFactorEnabled, so
// any live session for a super-admin has already passed 2FA at sign-in time.
// Step-up auth (re-verify TOTP for destructive admin actions like credit /
// override-status) is a Fase 4 concern, tracked alongside SE4b/SE4c.
export async function requireSuperAdmin2FA(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (!request.user) {
    await reply.status(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    })
    return
  }
  if (request.user.isSuperAdmin !== true) {
    await reply.status(403).send({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Super-admin required' },
    })
    return
  }
  const twoFactorEnabled = await userStatus.hasTwoFactorEnabled(request.user.id)
  if (!twoFactorEnabled) {
    await reply.status(403).send({
      success: false,
      error: {
        code: 'TWO_FACTOR_REQUIRED',
        message:
          'Two-factor authentication must be enabled on your account to access this endpoint',
      },
    })
  }
}
