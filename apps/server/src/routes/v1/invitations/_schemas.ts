import { z } from 'zod'

import { roleEnum } from '../../shared/enums.schema.js'
import { idParam } from '../../shared/params.schema.js'
import {
  paginatedResponse,
  successResponse,
} from '../../shared/response.schema.js'

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
  inviterId: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export const invitationDetailResponse = successResponse(invitationSchema)
export const invitationListResponse = paginatedResponse(invitationSchema)
export const invitationDeleteResponse = successResponse(
  z.object({ id: z.string() })
)

// --- Public invitation schemas ---

export const publicInvitationResponse = successResponse(
  z.object({
    id: z.string(),
    email: z.string(),
    role: z.string(),
    status: z.string(),
    expiresAt: z.coerce.date(),
    organizationName: z.string(),
    inviterName: z.string(),
    hasAccount: z.boolean(),
    currentSession: z
      .object({
        userId: z.string(),
        email: z.string(),
      })
      .nullable(),
  })
)

export const acceptInvitationBodySchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('register'),
    name: z.string().min(2),
    password: z.string().min(8),
  }),
  z.object({
    mode: z.literal('login'),
    password: z.string().min(1),
  }),
  z.object({
    mode: z.literal('current-session'),
  }),
])

export const acceptInvitationResponse = successResponse(
  z.object({
    organizationId: z.string(),
    role: z.string(),
  })
)
