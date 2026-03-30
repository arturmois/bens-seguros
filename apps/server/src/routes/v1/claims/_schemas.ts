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

const claimDetailSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  claimNumber: z.number(),
  policyId: z.string(),
  clientId: z.string(),
  insurerId: z.string().nullable(),
  assignedToId: z.string().nullable(),
  status: z.enum(CLAIM_STATUS_VALUES),
  priority: z.enum(CLAIM_PRIORITY_VALUES),
  description: z.string(),
  estimatedValueInCents: z.number().nullable(),
  incidentDate: z.coerce.date().nullable(),
  incidentLocation: z.string().nullable(),
  reportedAt: z.coerce.date(),
  resolvedAt: z.coerce.date().nullable(),
  closedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  policyNumber: z.string().optional(),
  clientName: z.string().optional(),
  insurerName: z.string().optional(),
  assignedToName: z.string().optional(),
})

const occurrenceSchema = z.object({
  id: z.string(),
  claimId: z.string(),
  organizationId: z.string(),
  type: z.string(),
  description: z.string(),
  metadata: jsonObjectSchema.nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.coerce.date(),
  createdByName: z.string().optional(),
})

export const claimListResponse = paginatedResponse(claimDetailSchema)
export const claimDetailResponse = successResponse(claimDetailSchema)
export const occurrenceResponse = successResponse(occurrenceSchema)
export const occurrenceListResponse = successResponse(z.array(occurrenceSchema))
export const deleteResponse = z.void()
export { errorResponse }
