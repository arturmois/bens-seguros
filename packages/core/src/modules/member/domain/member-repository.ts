export interface MemberRecord {
  readonly id: string
  readonly userId: string
  readonly organizationId: string
  readonly role: string
  readonly active: boolean
}

export interface MemberRepository {
  findById(id: string, organizationId: string): Promise<MemberRecord | null>
  countByRole(organizationId: string, role: string): Promise<number>
  updateRole(
    id: string,
    organizationId: string,
    role: string
  ): Promise<MemberRecord>
  deactivate(id: string, organizationId: string): Promise<void>
}
