import { prisma } from '@repo/db'
import type { Auth } from './index.js'

export interface IdentityLogger {
  error(obj: Record<string, unknown>, msg: string): void
  warn(obj: Record<string, unknown>, msg: string): void
  debug(obj: Record<string, unknown>, msg: string): void
}

export class InviteAuthError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string
  ) {
    super(message)
    this.name = 'InviteAuthError'
  }
}

export interface AuthResult {
  readonly userId: string
  readonly cookies: readonly string[]
}

export type InvitationAuthMode =
  | {
      readonly mode: 'register'
      readonly password: string
      readonly name: string
    }
  | { readonly mode: 'login'; readonly password: string }
  | { readonly mode: 'current-session' }

interface CallArgs {
  readonly headers: Headers
  readonly logger: IdentityLogger
}

interface SignUpArgs extends CallArgs {
  readonly email: string
  readonly password: string
  readonly name: string
}

interface SignInArgs extends CallArgs {
  readonly email: string
  readonly password: string
}

interface ApplyActiveOrgArgs extends CallArgs {
  readonly organizationId: string
}

interface AuthenticateForInvitationArgs extends CallArgs {
  readonly body: InvitationAuthMode
  readonly invitationEmail: string
}

interface CreateOrganizationForUserArgs {
  readonly name: string
  readonly slug: string
  readonly userId: string
  readonly headers: Headers
}

function extractAuthErrorCode(result: unknown): string | null {
  if (!result || typeof result !== 'object' || !('response' in result)) {
    return null
  }
  const { response } = result
  if (!response || typeof response !== 'object' || !('error' in response)) {
    return null
  }
  const { error } = response
  if (!error || typeof error !== 'object' || !('code' in error)) return null
  return typeof error.code === 'string' ? error.code : null
}

function mapSignUpError(code: string): InviteAuthError {
  if (code === 'USER_ALREADY_EXISTS') {
    return new InviteAuthError(
      409,
      'EMAIL_ALREADY_EXISTS',
      'Este email já tem conta. Acesse o convite usando login.'
    )
  }
  if (code === 'INVALID_PASSWORD' || code === 'PASSWORD_TOO_SHORT') {
    return new InviteAuthError(
      422,
      'WEAK_PASSWORD',
      'Senha não atende aos requisitos mínimos.'
    )
  }
  return new InviteAuthError(
    422,
    'REGISTRATION_FAILED',
    'Falha ao criar conta. Tente novamente.'
  )
}

function mapSignInError(code: string): InviteAuthError {
  if (code === 'INVALID_PASSWORD' || code === 'INVALID_CREDENTIALS') {
    return new InviteAuthError(401, 'INVALID_CREDENTIALS', 'Senha incorreta')
  }
  if (code === 'EMAIL_NOT_VERIFIED') {
    return new InviteAuthError(
      403,
      'EMAIL_NOT_VERIFIED',
      'Email não verificado.'
    )
  }
  return new InviteAuthError(401, 'SIGN_IN_FAILED', 'Falha ao autenticar')
}

export function createIdentityService(auth: Auth) {
  async function signInExisting(args: SignInArgs): Promise<AuthResult> {
    const { email, password, headers, logger } = args
    try {
      const result = await auth.api.signInEmail({
        body: { email, password },
        headers,
        returnHeaders: true,
      })
      const errorCode = extractAuthErrorCode(result)
      if (errorCode) throw mapSignInError(errorCode)
      return {
        userId: result.response.user.id,
        cookies: result.headers.getSetCookie(),
      }
    } catch (err) {
      if (err instanceof InviteAuthError) throw err
      logger.error({ err, stage: 'signIn', email }, 'Better Auth signIn failed')
      throw new InviteAuthError(401, 'SIGN_IN_FAILED', 'Falha ao autenticar')
    }
  }

  async function signUpAndSignIn(args: SignUpArgs): Promise<AuthResult> {
    const { email, password, name, headers, logger } = args
    let userId: string
    try {
      const signUpResult = await auth.api.signUpEmail({
        body: { email, password, name },
        headers,
        returnHeaders: true,
      })
      const errorCode = extractAuthErrorCode(signUpResult)
      if (errorCode) throw mapSignUpError(errorCode)
      userId = signUpResult.response.user.id
    } catch (err) {
      if (err instanceof InviteAuthError) throw err
      logger.error({ err, stage: 'signUp', email }, 'Better Auth signUp failed')
      throw new InviteAuthError(
        422,
        'REGISTRATION_FAILED',
        'Falha ao criar conta. Tente novamente.'
      )
    }
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    })
    const signInResult = await signInExisting({
      email,
      password,
      headers,
      logger,
    })
    return { userId, cookies: signInResult.cookies }
  }

  async function applyActiveOrg(
    args: ApplyActiveOrgArgs
  ): Promise<readonly string[]> {
    const { organizationId, headers, logger } = args
    try {
      const result = await auth.api.setActiveOrganization({
        body: { organizationId },
        headers,
        returnHeaders: true,
      })
      return result.headers.getSetCookie()
    } catch (err) {
      logger.warn(
        { err, organizationId },
        'Failed to set active organization after invitation accept'
      )
      return []
    }
  }

  async function readCurrentSession(
    args: CallArgs
  ): Promise<{ userId: string; email: string } | null> {
    const { headers, logger } = args
    try {
      const session = await auth.api.getSession({ headers })
      if (!session?.user) return null
      return { userId: session.user.id, email: session.user.email }
    } catch (err) {
      logger.debug({ err }, 'getSession failed (likely not logged in)')
      return null
    }
  }

  async function authenticateForInvitation(
    args: AuthenticateForInvitationArgs
  ): Promise<AuthResult> {
    const { body, invitationEmail, headers, logger } = args
    if (body.mode === 'register') {
      return signUpAndSignIn({
        email: invitationEmail,
        password: body.password,
        name: body.name,
        headers,
        logger,
      })
    }
    if (body.mode === 'login') {
      return signInExisting({
        email: invitationEmail,
        password: body.password,
        headers,
        logger,
      })
    }
    const session = await readCurrentSession({ headers, logger })
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

  async function createOrganizationForUser(
    args: CreateOrganizationForUserArgs
  ): Promise<{ id: string }> {
    const { name, slug, userId, headers } = args
    const res = await auth.api.createOrganization({
      body: { name, slug, userId },
      headers,
    })
    return { id: res.id }
  }

  return {
    signUpAndSignIn,
    signInExisting,
    applyActiveOrg,
    readCurrentSession,
    authenticateForInvitation,
    createOrganizationForUser,
  }
}

export type IdentityService = ReturnType<typeof createIdentityService>
