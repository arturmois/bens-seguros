import type { Role } from './roles.js'

export interface AuthUser {
  id: string
  email: string
  name: string
  emailVerified: boolean
  image?: string | null
  isSuperAdmin: boolean
}

export interface AuthSession {
  id: string
  token: string
  userId: string
  activeOrganizationId?: string | null
  expiresAt: Date
}

export interface AuthMember {
  id: string
  organizationId: string
  userId: string
  role: Role
  active: boolean
}

export interface AuthContext {
  user: AuthUser
  session: AuthSession
  organizationId: string
  role: Role
}
