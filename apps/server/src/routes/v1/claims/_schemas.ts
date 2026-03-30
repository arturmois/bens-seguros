import { z } from 'zod'

import { paginationQuery } from '../../_shared/pagination.schema.js'
import { idParam } from '../../_shared/params.schema.js'
import {
  optionalString,
  optionalDate,
  jsonObjectSchema,
} from '../../_shared/transforms.js'
import {
  successResponse,
  paginatedResponse,
  errorResponse,
} from '../../_shared/response.schema.js'

// --- Enums ---

const CLAIM_STATUS_VALUES = [
  'REGISTERED',
  'IN_ANALYSIS',
  'AWAITING_DOCUMENT',
  'PENDING_INSPECTION',
  'APPROVED',
  'REJECTED',
  'PAID',
  'COMPLETED',
] as const

const CLAIM_PRIORITY_VALUES = ['NORMAL', 'HIGH', 'URGENT'] as const

// --- Request schemas ---

export const createClaimBodySchema = z.object({
  policyId: z.string().min(1),
  clientId: z.string().min(1),
  insurerId: optionalString,
  assignedToId: optionalString,
  priority: z.enum(CLAIM_PRIORITY_VALUES).optional(),
  description: z.string().min(1),
  estimatedValueInCents: z.number().int().min(0).optional(),
  incidentDate: optionalDate,
  incidentLocation: optionalString,
})

export const updateClaimStatusBodySchema = z.object({
  status: z.enum(CLAIM_STATUS_VALUES),
})

export const listClaimsQuerySchema = paginationQuery().extend({
  status: z.enum(CLAIM_STATUS_VALUES).optional(),
  priority: z.enum(CLAIM_PRIORITY_VALUES).optional(),
  policyId: z.string().optional(),
  clientId: z.string().optional(),
  search: z.string().optional(),
})

export const createOccurrenceBodySchema = z.object({
  type: z.string().min(1),
  description: z.string().min(1),
  metadata: jsonObjectSchema.optional(),
})

export { idParam as idParamSchema }

// --- Response schemas (OpenAPI) ---

const claimListItemSchema = z.object({
  id: z.string(),
  claimNumber: z.number(),
  status: z.enum(CLAIM_STATUS_VALUES),
  priority: z.enum(CLAIM_PRIORITY_VALUES).nullable(),
  description: z.string(),
  policyId: z.string(),
  clientId: z.string(),
  createdAt: z.coerce.date(),
})

const claimDetailSchema = claimListItemSchema.extend({
  insurerId: z.string().nullable().optional(),
  assignedToId: z.string().nullable().optional(),
  estimatedValueInCents: z.number().nullable().optional(),
  incidentDate: z.coerce.date().nullable().optional(),
  incidentLocation: z.string().nullable().optional(),
  updatedAt: z.coerce.date(),
})

const occurrenceSchema = z.object({
  id: z.string(),
  claimId: z.string(),
  type: z.string(),
  description: z.string(),
  metadata: jsonObjectSchema.nullable().optional(),
  createdBy: z.string(),
  createdAt: z.coerce.date(),
})

export const claimListResponse = paginatedResponse(claimListItemSchema)
export const claimDetailResponse = successResponse(claimDetailSchema)
export const occurrenceResponse = successResponse(occurrenceSchema)
export const occurrenceListResponse = successResponse(z.array(occurrenceSchema))
export const deleteResponse = z.void()
export { errorResponse }
