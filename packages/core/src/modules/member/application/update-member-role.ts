import { injectable, inject } from 'tsyringe'
import {
  MEMBER_ROLE_HIERARCHY,
  isMemberRole,
  type MemberRole,
} from '../domain/member-roles.js'
import type {
  MemberRepository,
  MemberRecord,
} from '../domain/member-repository.js'
import {
  LastOwnerError,
  MemberNotFoundError,
  RoleHierarchyError,
  SelfRemovalError,
} from '../domain/member-errors.js'

function toMemberRole(value: string): MemberRole {
  if (isMemberRole(value)) return value
  throw new RoleHierarchyError()
}

function assertCanManageRole(
  callerRole: MemberRole,
  targetRole: MemberRole
): void {
  if (MEMBER_ROLE_HIERARCHY[callerRole] <= MEMBER_ROLE_HIERARCHY[targetRole]) {
    throw new RoleHierarchyError()
  }
}

export interface UpdateMemberRoleInput {
  readonly id: string
  readonly organizationId: string
  readonly callerUserId: string
  readonly callerRole: MemberRole
  readonly newRole: string
}

@injectable()
export class UpdateMemberRole {
  constructor(
    @inject('MemberRepository') private readonly memberRepo: MemberRepository
  ) {}

  async execute(input: UpdateMemberRoleInput): Promise<MemberRecord> {
    const { id, organizationId, callerUserId, callerRole, newRole } = input

    const member = await this.memberRepo.findById(id, organizationId)
    if (!member) throw new MemberNotFoundError(id)
    if (member.userId === callerUserId) throw new SelfRemovalError()

    assertCanManageRole(callerRole, toMemberRole(member.role))
    assertCanManageRole(callerRole, toMemberRole(newRole))

    if (member.role === 'OWNER') {
      const ownerCount = await this.memberRepo.countByRole(
        organizationId,
        'OWNER'
      )
      if (ownerCount <= 1) throw new LastOwnerError()
    }

    return this.memberRepo.updateRole(id, organizationId, newRole)
  }
}
