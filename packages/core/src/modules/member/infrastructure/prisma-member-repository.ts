import { injectable, inject } from 'tsyringe'
import type { PrismaClient, Role } from '@repo/db'
import type {
  MemberRepository,
  MemberRecord,
} from '../domain/member-repository.js'
import { MEMBER_ROLES, type MemberRole } from '../domain/member-roles.js'

const VALID_ROLE_VALUES: ReadonlySet<string> = new Set(
  Object.values(MEMBER_ROLES)
)

function toPrismaRole(value: string): Role {
  if (VALID_ROLE_VALUES.has(value)) return value as Role
  throw new Error(`Invalid role value: ${value}`)
}

type MemberRow = {
  readonly id: string
  readonly userId: string
  readonly organizationId: string
  readonly role: Role
  readonly active: boolean
}

function toMemberRecord(row: MemberRow): MemberRecord {
  return {
    id: row.id,
    userId: row.userId,
    organizationId: row.organizationId,
    role: row.role as MemberRole,
    active: row.active,
  }
}

@injectable()
export class PrismaMemberRepository implements MemberRepository {
  constructor(@inject('PrismaClient') private readonly prisma: PrismaClient) {}

  async findById(
    id: string,
    organizationId: string
  ): Promise<MemberRecord | null> {
    const row = await this.prisma.member.findFirst({
      where: { id, organizationId, active: true },
    })
    return row ? toMemberRecord(row) : null
  }

  async countByRole(organizationId: string, role: string): Promise<number> {
    return this.prisma.member.count({
      where: { organizationId, role: toPrismaRole(role), active: true },
    })
  }

  async updateRole(
    id: string,
    organizationId: string,
    role: string
  ): Promise<MemberRecord> {
    const row = await this.prisma.member.update({
      where: { id, organizationId },
      data: { role: toPrismaRole(role) },
    })
    return toMemberRecord(row)
  }

  async deactivate(id: string, organizationId: string): Promise<void> {
    await this.prisma.member.update({
      where: { id, organizationId },
      data: { active: false },
    })
  }
}
