export interface MemberRecord {
  readonly id: string
  readonly userId: string
  readonly organizationId: string
  readonly role: string
  readonly active: boolean
}

export interface MemberContact {
  readonly userId: string
  readonly email: string | null
  readonly name: string | null
}

export interface OrganizationMembership {
  readonly id: string
  readonly name: string
  readonly slug: string
  readonly logo: string | null
  readonly role: string
}

export interface MemberListItem {
  readonly id: string
  readonly userId: string
  readonly name: string | null
  readonly email: string
  readonly role: string
  readonly active: boolean
  readonly createdAt: string
}

export interface MemberListPage {
  readonly items: readonly MemberListItem[]
  readonly total: number
  readonly nextCursor: string | null
}

export interface MemberRepository {
  findById(id: string, organizationId: string): Promise<MemberRecord | null>
  findOldestActive(organizationId: string): Promise<MemberRecord | null>
  countByRole(organizationId: string, role: string): Promise<number>
  updateRole(
    id: string,
    organizationId: string,
    role: string
  ): Promise<MemberRecord>
  deactivate(id: string, organizationId: string): Promise<void>
  listOrganizationsForUser(userId: string): Promise<OrganizationMembership[]>
  listActive(
    organizationId: string,
    options: { limit: number; cursor?: string }
  ): Promise<MemberListPage>
  existsActiveByEmail(organizationId: string, email: string): Promise<boolean>
  findContactsByRoles(
    organizationId: string,
    roles: readonly string[],
    excludeUserId?: string
  ): Promise<MemberContact[]>
  findContactByUserId(
    organizationId: string,
    userId: string
  ): Promise<MemberContact | null>
}
