import { prisma } from '@repo/db'
import { env } from '@repo/env'
import { betterAuth, type BetterAuthOptions } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { customSession, organization } from 'better-auth/plugins'
import { createAccessControl, role } from 'better-auth/plugins/access'

const ORGANIZATION_STATEMENTS = {
  organization: ['update', 'delete'],
  member: ['create', 'update', 'delete'],
  invitation: ['create', 'cancel'],
} as const

const ac = createAccessControl(ORGANIZATION_STATEMENTS)

const OWNER_ROLE = ac.newRole({
  organization: ['update', 'delete'],
  member: ['create', 'update', 'delete'],
  invitation: ['create', 'cancel'],
})

const ADMIN_ROLE = ac.newRole({
  organization: ['update'],
  member: ['create', 'update', 'delete'],
  invitation: ['create', 'cancel'],
})

const MANAGER_ROLE = ac.newRole({
  member: ['create'],
  invitation: ['create'],
})

const COMMERCIAL_ROLE = ac.newRole({
  invitation: ['create'],
})

const VIEWER_ROLE = role({})

interface AuthEmailSenders {
  readonly sendVerificationEmail: (
    email: string,
    name: string,
    url: string
  ) => void
  readonly sendResetPasswordEmail: (
    email: string,
    name: string,
    url: string
  ) => void
  readonly frontendUrl: string
}

export function createAuth(
  secret: string,
  baseURL: string,
  trustedOrigins: string[],
  cookieDomain?: string,
  emailSenders?: AuthEmailSenders
) {
  const isProduction = env.NODE_ENV === 'production'
  const options = {
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
    secret,
    baseURL,
    trustedOrigins,
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      requireEmailVerification: isProduction || !!emailSenders,
      sendResetPassword: emailSenders
        ? async ({
            user,
            token,
          }: {
            user: { email: string; name: string }
            token: string
          }) => {
            const url = `${emailSenders.frontendUrl}/reset-password?token=${token}`
            emailSenders.sendResetPasswordEmail(user.email, user.name, url)
          }
        : undefined,
    },
    emailVerification: emailSenders
      ? {
          sendOnSignUp: true,
          sendOnSignIn: true,
          autoSignInAfterVerification: true,
          expiresIn: 86400, // 24h
          sendVerificationEmail: async ({
            user,
            token,
          }: {
            user: { email: string; name: string }
            token: string
          }) => {
            const callbackURL = encodeURIComponent(
              `${emailSenders.frontendUrl}/onboarding`
            )
            const url = `${baseURL}/api/auth/verify-email?token=${token}&callbackURL=${callbackURL}`
            emailSenders.sendVerificationEmail(user.email, user.name, url)
          },
        }
      : undefined,
    advanced: {
      crossSubDomainCookies:
        isProduction && cookieDomain
          ? { enabled: true, domain: cookieDomain }
          : undefined,
      defaultCookieAttributes:
        isProduction && cookieDomain ? { domain: cookieDomain } : undefined,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 3, // 3 days (reduced from 7)
      updateAge: 60 * 60 * 12, // 12 hours (rotation on privilege use)
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60, // 5 min
      },
    },
    plugins: [
      organization({
        ac,
        roles: {
          OWNER: OWNER_ROLE,
          ADMIN: ADMIN_ROLE,
          MANAGER: MANAGER_ROLE,
          COMMERCIAL: COMMERCIAL_ROLE,
          VIEWER: VIEWER_ROLE,
        },
        creatorRole: 'OWNER',
        organizationLimit: env.MAX_ORGS_PER_USER,
      }),
    ],
  } satisfies BetterAuthOptions
  return betterAuth({
    ...options,
    plugins: [
      ...(options.plugins ?? []),
      customSession(async ({ user, session }) => {
        return {
          user,
          session: {
            id: session.id,
            userId: session.userId,
            expiresAt: session.expiresAt,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
            activeOrganizationId: session.activeOrganizationId,
          },
        }
      }, options),
    ],
  })
}

export type Auth = ReturnType<typeof createAuth>
