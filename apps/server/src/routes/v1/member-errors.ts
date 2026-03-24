export class MemberNotFoundError extends Error {
  readonly code = 'MEMBER_NOT_FOUND' as const
  constructor(id: string) {
    super(`Member ${id} not found`)
    this.name = 'MemberNotFoundError'
  }
}

export class LastOwnerError extends Error {
  readonly code = 'LAST_OWNER' as const
  constructor() {
    super('Cannot remove or demote the last owner')
    this.name = 'LastOwnerError'
  }
}

export class RoleHierarchyError extends Error {
  readonly code = 'ROLE_HIERARCHY_VIOLATION' as const
  constructor() {
    super('Cannot assign or manage a role equal to or higher than your own')
    this.name = 'RoleHierarchyError'
  }
}

export class DuplicateInvitationError extends Error {
  readonly code = 'DUPLICATE_INVITATION' as const
  constructor(email: string) {
    super(`User ${email} is already a member or has a pending invitation`)
    this.name = 'DuplicateInvitationError'
  }
}

export class InvitationNotFoundError extends Error {
  readonly code = 'INVITATION_NOT_FOUND' as const
  constructor(id: string) {
    super(`Invitation ${id} not found`)
    this.name = 'InvitationNotFoundError'
  }
}

export class SelfRemovalError extends Error {
  readonly code = 'SELF_REMOVAL' as const
  constructor() {
    super('Cannot remove or change your own role')
    this.name = 'SelfRemovalError'
  }
}
