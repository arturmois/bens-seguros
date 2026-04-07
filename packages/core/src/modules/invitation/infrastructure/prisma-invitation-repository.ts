import type { PrismaClient, Role } from '@repo/db'
import type {
  InvitationRecord,
  InvitationRepository,
} from '../domain/invitation-repository.js'

// Allowed role values at the infrastructure boundary.
// Mirrors the Prisma Role enum without importing the runtime value.
const VALID_ROLES: ReadonlySet<string> = new Set([
  'OWNER',
  'ADMIN',
  'MANAGER',
  'COMMERCIAL',
  'VIEWER',
])

function toRole(value: string): Role {
  if (VALID_ROLES.has(value)) return value as Role
  throw new Error(`Invalid role value: ${value}`)
}

export class PrismaInvitationRepository implements InvitationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<InvitationRecord | null> {
    const row = await this.prisma.invitation.findUnique({ where: { id } })
    if (!row) return null
    return {
      id: row.id,
      email: row.email,
      organizationId: row.organizationId,
      role: row.role,
      status: row.status,
      expiresAt: row.expiresAt,
    }
  }

  async isMember(organizationId: string, userId: string): Promise<boolean> {
    const member = await this.prisma.member.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    })
    return member !== null
  }

  async acceptAndCreateMember(
    invitationId: string,
    userId: string,
    organizationId: string,
    role: string
  ): Promise<void> {
    const memberRole = toRole(role)
    await this.prisma.$transaction([
      this.prisma.member.create({
        data: { organizationId, userId, role: memberRole },
      }),
      this.prisma.invitation.update({
        where: { id: invitationId },
        data: { status: 'accepted' },
      }),
    ])
  }
}
