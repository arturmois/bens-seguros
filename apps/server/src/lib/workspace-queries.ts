import { GetUserStatus, ResolveMembership } from '@repo/core'
import { prisma } from '@repo/db'

// Non-admin client on purpose: membership lookups must keep RLS behavior.
export const resolveMembership = new ResolveMembership(prisma)
export const userStatus = new GetUserStatus(prisma)
