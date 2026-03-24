import { z } from 'zod'

export const createInvitationBodySchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'MANAGER', 'COMMERCIAL', 'VIEWER']),
})

export const changeMemberRoleBodySchema = z.object({
  role: z.enum(['ADMIN', 'MANAGER', 'COMMERCIAL', 'VIEWER']),
})

export const listMembersQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
})

export const listInvitationsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
})
