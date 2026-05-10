import { z } from 'zod'

import { csvEnumArray } from '../../shared/csv-array.schema.js'
import { dateRangeQuery } from '../../shared/date-range.schema.js'
import { paginationQuery } from '../../shared/pagination.schema.js'
import { idParam } from '../../shared/params.schema.js'
import {
  errorResponse,
  paginatedResponse,
  successResponse,
} from '../../shared/response.schema.js'

export const COMMISSION_STATUS_VALUES = [
  'PENDING_COMMERCIAL',
  'PENDING_ADMIN',
  'APPROVED',
  'PAID',
  'REJECTED',
  'REVERSED',
] as const

export const commissionStatusEnum = z.enum(COMMISSION_STATUS_VALUES)

export const commissionIdParam = idParam

export const listCommissionsQuery = paginationQuery()
  .merge(dateRangeQuery)
  .extend({
    status: commissionStatusEnum.optional(),
    statusIn: csvEnumArray(commissionStatusEnum).optional(),
    salespersonId: z.string().optional(),
    policyId: z.string().optional(),
    search: z.string().optional(),
    sortBy: z
      .enum([
        'salespersonName',
        'status',
        'commissionValueInCents',
        'createdAt',
      ])
      .optional()
      .default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  })

export const rejectCommissionBody = z.object({
  reason: z.string().min(1),
})

const commissionItem = z.object({
  id: z.string(),
  organizationId: z.string(),
  policyId: z.string(),
  salespersonId: z.string(),
  status: commissionStatusEnum,
  commissionValueInCents: z.number(),
  premiumValueInCents: z.number(),
  percentageInBasisPoints: z.number(),
  splitPercentage: z.number().nullable(),
  approvedBy: z.string().nullable(),
  approvedAt: z.coerce.date().nullable(),
  paidAt: z.coerce.date().nullable(),
  rejectedBy: z.string().nullable(),
  rejectedAt: z.coerce.date().nullable(),
  rejectionReason: z.string().nullable(),
  isReversal: z.boolean(),
  originalCommissionId: z.string().nullable(),
  deletedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  salespersonName: z.string().optional(),
  policyNumber: z.string().optional(),
  clientName: z.string().optional(),
})

export const commissionListResponse = paginatedResponse(commissionItem)
export const commissionDetailResponse = successResponse(commissionItem)

const reversalResultSchema = z.object({
  reversal: commissionItem,
  original: commissionItem,
})

export const commissionReversalResponse = successResponse(reversalResultSchema)
export const commissionErrorResponse = errorResponse
