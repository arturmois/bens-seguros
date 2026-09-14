import type { PrismaClient, Role } from '@repo/db'

export type MembershipDb = Pick<PrismaClient, 'member'>

export interface ResolveMembershipInput {
  readonly userId: string
  readonly organizationId: string
}

export interface Membership {
  readonly role: Role
  readonly active: boolean
}

export class ResolveMembership {
  constructor(private readonly db: MembershipDb) {}

  async execute(input: ResolveMembershipInput): Promise<Membership | null> {
    const { userId, organizationId } = input
    const member = await this.db.member.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    })
    return member ? { role: member.role, active: member.active } : null
  }
}
