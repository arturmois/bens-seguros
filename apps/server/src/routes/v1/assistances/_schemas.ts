import { z } from 'zod'

import { csvEnumArray } from '../../shared/csv-array.schema.js'
import { idParam } from '../../shared/params.schema.js'
import {
  paginatedResponse,
  successResponse,
} from '../../shared/response.schema.js'

const ASSISTANCE_STATUS_VALUES = [
  'REQUESTED',
  'AWAITING_DOCUMENT',
  'PENDING_INSPECTION',
  'DISPATCHED',
  'IN_PROGRESS',
  'COMPLETED',
] as const

const assistanceStatusEnum = z.enum(ASSISTANCE_STATUS_VALUES)

const emptyToUndefined = z.literal('').transform(() => undefined)

const optionalString = z.union([emptyToUndefined, z.string()]).optional()

const optionalDate = z.union([emptyToUndefined, z.coerce.date()]).optional()

export const createAssistanceBodySchema = z.object({
  policyId: z.string().min(1),
  clientId: z.string().min(1),
  claimId: optionalString,
  type: z.string().min(1),
  description: optionalString,
  address: optionalString,
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  providerName: optionalString,
  providerPhone: optionalString,
  scheduledAt: optionalDate,
})

export const updateAssistanceStatusBodySchema = z.object({
  status: z.enum(ASSISTANCE_STATUS_VALUES),
})

export const listAssistancesQuerySchema = z.object({
  status: assistanceStatusEnum.optional(),
  statusIn: csvEnumArray(assistanceStatusEnum).optional(),
  statusGroup: z.enum(['open', 'closed']).optional(),
  policyId: z.string().optional(),
  clientId: z.string().optional(),
  type: z.string().optional(),
  typeIn: csvEnumArray(z.string().min(1)).optional(),
  search: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z
    .enum(['type', 'status', 'requestedAt', 'createdAt'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
})

export { idParam as idParamSchema }

// --- Response schemas ---

const assistanceSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  policyId: z.string(),
  clientId: z.string(),
  claimId: z.string().nullable(),
  type: z.string(),
  status: z.enum(ASSISTANCE_STATUS_VALUES),
  description: z.string().nullable(),
  address: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  providerName: z.string().nullable(),
  providerPhone: z.string().nullable(),
  requestedAt: z.coerce.date(),
  scheduledAt: z.coerce.date().nullable(),
  completedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  policyNumber: z.string().optional(),
  clientName: z.string().optional(),
})

export const assistanceDetailResponse = successResponse(assistanceSchema)
export const assistanceListResponse = paginatedResponse(assistanceSchema)
