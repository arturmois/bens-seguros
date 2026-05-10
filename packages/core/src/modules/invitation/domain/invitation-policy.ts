import { RoleHierarchyError } from '../../member/domain/member-errors.js'
import {
  MEMBER_ROLE_HIERARCHY,
  type MemberRole,
} from '../../member/domain/member-roles.js'

export const INVITATION_TTL_DAYS = 7

const MS_PER_DAY = 24 * 60 * 60 * 1000

export function invitationExpiresAt(now: Date = new Date()): Date {
  return new Date(now.getTime() + INVITATION_TTL_DAYS * MS_PER_DAY)
}

export function assertCanManageRole(
  callerRole: MemberRole,
  targetRole: MemberRole
): void {
  if (MEMBER_ROLE_HIERARCHY[callerRole] <= MEMBER_ROLE_HIERARCHY[targetRole]) {
    throw new RoleHierarchyError()
  }
}
