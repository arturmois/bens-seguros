import { z } from 'zod'

import { roleEnum } from '../../shared/enums.schema.js'
import { idParam } from '../../shared/params.schema.js'
import {
  paginatedResponse,
  successResponse,
} from '../../shared/response.schema.js'

export const changeMemberRoleBodySchema = z.object({
  role: roleEnum,
})

export const listMembersQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
})

export { idParam as idParamSchema }

// --- Response schemas ---

const memberListItemSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string().nullable(),
  email: z.string(),
  role: z.string(),
  active: z.boolean(),
  createdAt: z.string(),
})

export const memberListResponse = paginatedResponse(memberListItemSchema)

const memberRecordSchema = z.object({
  id: z.string(),
  userId: z.string(),
  organizationId: z.string(),
  role: z.string(),
  active: z.boolean(),
})

export const memberUpdateResponse = successResponse(memberRecordSchema)
export const memberDeleteResponse = successResponse(
  z.object({ id: z.string() })
)
