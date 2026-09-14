import type { PrismaClient } from '@repo/db'

export type UserStatusDb = Pick<PrismaClient, 'user'>

export class GetUserStatus {
  constructor(private readonly db: UserStatusDb) {}

  async isSuperAdmin(userId: string): Promise<boolean> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { isSuperAdmin: true },
    })
    return user?.isSuperAdmin === true
  }

  async hasTwoFactorEnabled(userId: string): Promise<boolean> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true },
    })
    return user?.twoFactorEnabled === true
  }
}
