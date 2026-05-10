import type { Auth } from '@repo/auth'
import { prisma } from '@repo/db'
import type { FastifyBaseLogger, FastifyRequest } from 'fastify'

export function buildOriginHeaders(request: FastifyRequest): Headers {
  const headers = new Headers()
  headers.set(
    'origin',
    request.headers.origin ?? request.headers.referer ?? 'http://localhost:3000'
  )
  const cookieHeader = request.headers.cookie
  if (cookieHeader) headers.set('cookie', cookieHeader)
  return headers
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

export interface AuthCallArgs {
  readonly auth: Auth
  readonly headers: Headers
  readonly logger: FastifyBaseLogger
}

interface SignUpArgs extends AuthCallArgs {
  readonly email: string
  readonly password: string
  readonly name: string
}

interface SignInArgs extends AuthCallArgs {
  readonly email: string
  readonly password: string
}

export interface AuthResult {
  readonly userId: string
  readonly cookies: readonly string[]
}

function extractAuthErrorCode(result: unknown): string | null {
  if (!result || typeof result !== 'object') return null
  const candidate = result as { response?: { error?: { code?: string } } }
  return candidate.response?.error?.code ?? null
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

export async function signUpAndSignIn(args: SignUpArgs): Promise<AuthResult> {
  const { auth, email, password, name, headers, logger } = args
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
    auth,
    email,
    password,
    headers,
    logger,
  })
  return { userId, cookies: signInResult.cookies }
}

export async function signInExisting(args: SignInArgs): Promise<AuthResult> {
  const { auth, email, password, headers, logger } = args
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

export async function applyActiveOrg(args: {
  readonly auth: Auth
  readonly organizationId: string
  readonly headers: Headers
  readonly logger: FastifyBaseLogger
}): Promise<readonly string[]> {
  const { auth, organizationId, headers, logger } = args
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

export async function readCurrentSession(args: AuthCallArgs): Promise<{
  userId: string
  email: string
} | null> {
  const { auth, headers, logger } = args
  try {
    const session = await auth.api.getSession({ headers })
    if (!session?.user) return null
    return { userId: session.user.id, email: session.user.email }
  } catch (err) {
    logger.debug({ err }, 'getSession failed (likely not logged in)')
    return null
  }
}
