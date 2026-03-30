import { z } from 'zod'

import { dateRangeQuery } from '../../_shared/date-range.schema.js'
import { paginationQuery } from '../../_shared/pagination.schema.js'
import { idParam } from '../../_shared/params.schema.js'
import {
  errorResponse,
  paginatedResponse,
  successResponse,
} from '../../_shared/response.schema.js'

// ── Enums ──────────────────────────────────────────────────────────

export const COMMISSION_STATUS_VALUES = [
  'PENDING_COMMERCIAL',
  'PENDING_ADMIN',
  'APPROVED',
  'PAID',
  'REJECTED',
  'REVERSED',
] as const

export const commissionStatusEnum = z.enum(COMMISSION_STATUS_VALUES)

// ── Params ─────────────────────────────────────────────────────────

export const commissionIdParam = idParam

// ── Query ──────────────────────────────────────────────────────────

export const listCommissionsQuery = paginationQuery()
  .merge(dateRangeQuery)
  .extend({
    status: commissionStatusEnum.optional(),
    salespersonId: z.string().optional(),
    policyId: z.string().optional(),
    search: z.string().optional(),
  })

// ── Body ───────────────────────────────────────────────────────────

export const rejectCommissionBody = z.object({
  reason: z.string().min(1),
})

// ── Response (OpenAPI) ─────────────────────────────────────────────

const commissionItem = z.object({
  id: z.string(),
  status: commissionStatusEnum,
  commissionValueInCents: z.number(),
  salespersonId: z.string().nullable(),
  policyId: z.string().nullable(),
  policyNumber: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export const commissionListResponse = paginatedResponse(commissionItem)
export const commissionDetailResponse = successResponse(commissionItem)
export const commissionErrorResponse = errorResponse
