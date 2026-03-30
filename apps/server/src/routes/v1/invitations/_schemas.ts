import { z } from 'zod'

import { idParam } from '../../_shared/params.schema.js'
import { roleEnum } from '../../_shared/enums.schema.js'
import {
  successResponse,
  paginatedResponse,
} from '../../_shared/response.schema.js'

export const createInvitationBodySchema = z.object({
  email: z.string().email(),
  role: roleEnum,
})

export const listInvitationsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
})

export { idParam as idParamSchema }

// --- Response schemas ---

const invitationSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  email: z.string(),
  role: z.string(),
  status: z.string(),
  expiresAt: z.coerce.date(),
  invitedBy: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export const invitationDetailResponse = successResponse(invitationSchema)
export const invitationListResponse = paginatedResponse(invitationSchema)
export const invitationDeleteResponse = successResponse(
  z.object({ id: z.string() })
)
