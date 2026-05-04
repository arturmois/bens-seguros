import {
  InviteAuthError,
  readCurrentSession,
  signInExisting,
  signUpAndSignIn,
  type AuthCallArgs,
  type AuthResult,
} from './_better-auth-helpers.js'
import type { acceptInvitationBodySchema } from './_schemas.js'

export type AcceptInvitationBody = ReturnType<
  typeof acceptInvitationBodySchema.parse
>

interface AuthenticateForInvitationArgs extends AuthCallArgs {
  readonly body: AcceptInvitationBody
  readonly invitationEmail: string
}

export async function authenticateForInvitation(
  args: AuthenticateForInvitationArgs
): Promise<AuthResult> {
  const { body, invitationEmail, auth, headers, logger } = args

  if (body.mode === 'register') {
    return signUpAndSignIn({
      auth,
      email: invitationEmail,
      password: body.password,
      name: body.name,
      headers,
      logger,
    })
  }

  if (body.mode === 'login') {
    return signInExisting({
      auth,
      email: invitationEmail,
      password: body.password,
      headers,
      logger,
    })
  }

  // mode === 'current-session': reuse existing logged-in session
  const session = await readCurrentSession({ auth, headers, logger })
  if (!session) {
    throw new InviteAuthError(
      401,
      'NO_SESSION',
      'Você não está autenticado. Faça login pra aceitar o convite.'
    )
  }
  if (session.email !== invitationEmail) {
    throw new InviteAuthError(
      403,
      'SESSION_EMAIL_MISMATCH',
      'Você está logado com outro email. Saia da sessão atual pra aceitar este convite.'
    )
  }
  return { userId: session.userId, cookies: [] }
}
