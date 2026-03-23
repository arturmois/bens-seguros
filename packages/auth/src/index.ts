import { prisma } from '@repo/db'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { organization } from 'better-auth/plugins'
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

export function createAuth(
  secret: string,
  baseURL: string,
  trustedOrigins: string[],
  cookieDomain?: string
) {
  const isProduction = process.env.NODE_ENV === 'production'

  return betterAuth({
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
    secret,
    baseURL,
    trustedOrigins,
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
    },
    advanced: {
      crossSubDomainCookies: isProduction
        ? { enabled: true, domain: cookieDomain }
        : undefined,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // 1 day
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
      }),
    ],
  })
}

export type Auth = ReturnType<typeof createAuth>
