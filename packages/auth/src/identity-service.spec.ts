import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Auth } from './index.js'
import { createIdentityService, InviteAuthError } from './identity-service.js'

vi.mock('@repo/db', () => ({
  prisma: { user: { update: vi.fn() } },
}))

const { prisma } = await import('@repo/db')

const api = {
  signUpEmail: vi.fn(),
  signInEmail: vi.fn(),
  setActiveOrganization: vi.fn(),
  getSession: vi.fn(),
  createOrganization: vi.fn(),
}

const logger = { error: vi.fn(), warn: vi.fn(), debug: vi.fn() }
const headers = new Headers({ cookie: 'incoming=1' })
const service = createIdentityService({ api } as unknown as Auth)

function setCookieHeaders(cookies: string[]) {
  return { getSetCookie: () => cookies }
}

function authErrorResult(code: string) {
  return {
    response: { error: { code } },
    headers: setCookieHeaders([]),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.user.update).mockResolvedValue({} as never)
})

describe('signUpAndSignIn', () => {
  const args = {
    email: 'invited@user.com',
    password: 'Senha@123',
    name: 'Daisy',
    headers,
    logger,
  }

  it('maps USER_ALREADY_EXISTS to 409 EMAIL_ALREADY_EXISTS', async () => {
    api.signUpEmail.mockResolvedValue(authErrorResult('USER_ALREADY_EXISTS'))
    const promise = service.signUpAndSignIn(args)
    await expect(promise).rejects.toBeInstanceOf(InviteAuthError)
    await expect(promise).rejects.toMatchObject({
      statusCode: 409,
      code: 'EMAIL_ALREADY_EXISTS',
      message: 'Este email já tem conta. Acesse o convite usando login.',
    })
  })

  it.each(['INVALID_PASSWORD', 'PASSWORD_TOO_SHORT'])(
    'maps %s to 422 WEAK_PASSWORD',
    async (code) => {
      api.signUpEmail.mockResolvedValue(authErrorResult(code))
      await expect(service.signUpAndSignIn(args)).rejects.toMatchObject({
        statusCode: 422,
        code: 'WEAK_PASSWORD',
        message: 'Senha não atende aos requisitos mínimos.',
      })
    }
  )

  it('maps an unknown error code to 422 REGISTRATION_FAILED', async () => {
    api.signUpEmail.mockResolvedValue(authErrorResult('SOMETHING_ELSE'))
    await expect(service.signUpAndSignIn(args)).rejects.toMatchObject({
      statusCode: 422,
      code: 'REGISTRATION_FAILED',
      message: 'Falha ao criar conta. Tente novamente.',
    })
  })

  it('maps a thrown error to 422 REGISTRATION_FAILED and logs it', async () => {
    api.signUpEmail.mockRejectedValue(new Error('network down'))
    await expect(service.signUpAndSignIn(args)).rejects.toMatchObject({
      statusCode: 422,
      code: 'REGISTRATION_FAILED',
      message: 'Falha ao criar conta. Tente novamente.',
    })
    expect(logger.error).toHaveBeenCalledTimes(1)
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it('marks email verified before signing in and returns sign-in cookies', async () => {
    api.signUpEmail.mockResolvedValue({
      response: { user: { id: 'user-new' } },
      headers: setCookieHeaders(['signup=ignored']),
    })
    api.signInEmail.mockResolvedValue({
      response: { user: { id: 'user-new' } },
      headers: setCookieHeaders(['session=abc; Path=/']),
    })
    const result = await service.signUpAndSignIn(args)
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-new' },
      data: { emailVerified: true },
    })
    const updateOrder = vi.mocked(prisma.user.update).mock
      .invocationCallOrder[0]
    const signInOrder = api.signInEmail.mock.invocationCallOrder[0]
    expect(updateOrder).toBeLessThan(signInOrder ?? 0)
    expect(result).toEqual({
      userId: 'user-new',
      cookies: ['session=abc; Path=/'],
    })
  })
})

describe('signInExisting', () => {
  const args = {
    email: 'invited@user.com',
    password: 'Senha@123',
    headers,
    logger,
  }

  it.each(['INVALID_PASSWORD', 'INVALID_CREDENTIALS'])(
    'maps %s to 401 INVALID_CREDENTIALS',
    async (code) => {
      api.signInEmail.mockResolvedValue(authErrorResult(code))
      await expect(service.signInExisting(args)).rejects.toMatchObject({
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Senha incorreta',
      })
    }
  )

  it('maps EMAIL_NOT_VERIFIED to 403 EMAIL_NOT_VERIFIED', async () => {
    api.signInEmail.mockResolvedValue(authErrorResult('EMAIL_NOT_VERIFIED'))
    await expect(service.signInExisting(args)).rejects.toMatchObject({
      statusCode: 403,
      code: 'EMAIL_NOT_VERIFIED',
      message: 'Email não verificado.',
    })
  })

  it('maps an unknown error code to 401 SIGN_IN_FAILED', async () => {
    api.signInEmail.mockResolvedValue(authErrorResult('SOMETHING_ELSE'))
    await expect(service.signInExisting(args)).rejects.toMatchObject({
      statusCode: 401,
      code: 'SIGN_IN_FAILED',
      message: 'Falha ao autenticar',
    })
  })

  it('maps a thrown error to 401 SIGN_IN_FAILED', async () => {
    api.signInEmail.mockRejectedValue(new Error('boom'))
    await expect(service.signInExisting(args)).rejects.toMatchObject({
      statusCode: 401,
      code: 'SIGN_IN_FAILED',
      message: 'Falha ao autenticar',
    })
  })

  it('passes credentials and headers and returns the Set-Cookie values', async () => {
    api.signInEmail.mockResolvedValue({
      response: { user: { id: 'user-1' } },
      headers: setCookieHeaders(['a=1', 'b=2']),
    })
    const result = await service.signInExisting(args)
    expect(api.signInEmail).toHaveBeenCalledWith({
      body: { email: 'invited@user.com', password: 'Senha@123' },
      headers,
      returnHeaders: true,
    })
    expect(result).toEqual({ userId: 'user-1', cookies: ['a=1', 'b=2'] })
  })
})

describe('applyActiveOrg', () => {
  it('returns [] and warns once when setActiveOrganization throws', async () => {
    api.setActiveOrganization.mockRejectedValue(new Error('boom'))
    const result = await service.applyActiveOrg({
      organizationId: 'org-1',
      headers,
      logger,
    })
    expect(result).toEqual([])
    expect(logger.warn).toHaveBeenCalledTimes(1)
  })

  it('returns the Set-Cookie values on success', async () => {
    api.setActiveOrganization.mockResolvedValue({
      headers: setCookieHeaders(['active_org=org-1']),
    })
    const result = await service.applyActiveOrg({
      organizationId: 'org-1',
      headers,
      logger,
    })
    expect(api.setActiveOrganization).toHaveBeenCalledWith({
      body: { organizationId: 'org-1' },
      headers,
      returnHeaders: true,
    })
    expect(result).toEqual(['active_org=org-1'])
  })
})

describe('readCurrentSession', () => {
  it('returns null when getSession throws', async () => {
    api.getSession.mockRejectedValue(new Error('no cookie'))
    expect(await service.readCurrentSession({ headers, logger })).toBeNull()
  })

  it('returns null when there is no user', async () => {
    api.getSession.mockResolvedValue(null)
    expect(await service.readCurrentSession({ headers, logger })).toBeNull()
  })

  it('returns userId and email when a session exists', async () => {
    api.getSession.mockResolvedValue({
      user: { id: 'user-3', email: 'invited@user.com' },
    })
    expect(await service.readCurrentSession({ headers, logger })).toEqual({
      userId: 'user-3',
      email: 'invited@user.com',
    })
  })
})

describe('authenticateForInvitation', () => {
  const invitationEmail = 'invited@user.com'

  it('current-session without session throws 401 NO_SESSION', async () => {
    api.getSession.mockResolvedValue(null)
    await expect(
      service.authenticateForInvitation({
        body: { mode: 'current-session' },
        invitationEmail,
        headers,
        logger,
      })
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'NO_SESSION',
      message: 'Você não está autenticado. Faça login pra aceitar o convite.',
    })
  })

  it('current-session with a different-case email throws 403 SESSION_EMAIL_MISMATCH', async () => {
    api.getSession.mockResolvedValue({
      user: { id: 'user-3', email: 'Invited@user.com' },
    })
    await expect(
      service.authenticateForInvitation({
        body: { mode: 'current-session' },
        invitationEmail,
        headers,
        logger,
      })
    ).rejects.toMatchObject({
      statusCode: 403,
      code: 'SESSION_EMAIL_MISMATCH',
      message:
        'Você está logado com outro email. Saia da sessão atual pra aceitar este convite.',
    })
  })

  it('current-session with matching email returns the session user and no cookies', async () => {
    api.getSession.mockResolvedValue({
      user: { id: 'user-3', email: invitationEmail },
    })
    const result = await service.authenticateForInvitation({
      body: { mode: 'current-session' },
      invitationEmail,
      headers,
      logger,
    })
    expect(result).toEqual({ userId: 'user-3', cookies: [] })
  })

  it('login signs in with the invitation email, not a body email', async () => {
    api.signInEmail.mockResolvedValue({
      response: { user: { id: 'user-1' } },
      headers: setCookieHeaders(['session=abc']),
    })
    await service.authenticateForInvitation({
      body: { mode: 'login', password: 'Senha@123' },
      invitationEmail,
      headers,
      logger,
    })
    expect(api.signInEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        body: { email: invitationEmail, password: 'Senha@123' },
      })
    )
  })
})

describe('createOrganizationForUser', () => {
  it('calls createOrganization with name, slug, userId and headers and returns the id', async () => {
    api.createOrganization.mockResolvedValue({ id: 'org-new', name: 'X' })
    const result = await service.createOrganizationForUser({
      name: 'Corretora Teste',
      slug: 'corretora-teste-abc123',
      userId: 'user-1',
      headers,
    })
    expect(api.createOrganization).toHaveBeenCalledWith({
      body: {
        name: 'Corretora Teste',
        slug: 'corretora-teste-abc123',
        userId: 'user-1',
      },
      headers,
    })
    expect(result).toEqual({ id: 'org-new' })
  })
})
