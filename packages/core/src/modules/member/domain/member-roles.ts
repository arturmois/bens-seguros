export const MEMBER_ROLES = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  COMMERCIAL: 'COMMERCIAL',
  VIEWER: 'VIEWER',
} as const

export type MemberRole = (typeof MEMBER_ROLES)[keyof typeof MEMBER_ROLES]

export const MEMBER_ROLE_HIERARCHY: Record<MemberRole, number> = {
  OWNER: 5,
  ADMIN: 4,
  MANAGER: 3,
  COMMERCIAL: 2,
  VIEWER: 1,
}

export function isMemberRole(value: string): value is MemberRole {
  return value in MEMBER_ROLE_HIERARCHY
}
