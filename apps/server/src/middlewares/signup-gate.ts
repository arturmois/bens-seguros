import { env } from '@repo/env'
import type { FastifyReply, FastifyRequest } from 'fastify'

// Fase 1 (billing foundation): gates public signup before Better Auth processes
// the request. When SIGNUP_MODE=closed, only invitation-based onboarding is
// allowed — `/api/auth/sign-up/email` returns 403. Other Better Auth endpoints
// (sign-in, forget-password, verify-email) keep working so existing users can
// still authenticate.
//
// Invitation acceptance creates users through `/api/v1/invitations/:id/accept`
// (separate route), which is not subject to this gate.
export async function signupGateHook(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (env.SIGNUP_MODE !== 'closed') return
  const pathname = request.url.split('?')[0] ?? request.url
  if (!pathname.endsWith('/sign-up/email')) return
  await reply.status(403).send({
    success: false,
    error: {
      code: 'SIGNUP_CLOSED',
      message: 'Public signup is currently disabled',
    },
  })
}
