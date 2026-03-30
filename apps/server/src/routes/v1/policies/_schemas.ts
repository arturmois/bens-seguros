import { z } from 'zod'
import { branchEnum } from '../../_shared/enums.schema.js'
import { idParam } from '../../_shared/params.schema.js'
import { paginationQuery } from '../../_shared/pagination.schema.js'
import {
  successResponse,
  errorResponse,
} from '../../_shared/response.schema.js'

export { idParam }

export const POLICY_STATUS_VALUES = ['ACTIVE', 'CANCELLED', 'EXPIRED'] as const

export const policyStatusEnum = z.enum(POLICY_STATUS_VALUES)

export const issuePolicyBody = z
  .object({
    proposalId: z.string().min(1),
    policyNumber: z.string().min(1),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    coverageDetails: z.record(z.unknown()).optional(),
  })
  .refine((d) => d.endDate > d.startDate, {
    message: 'Data de fim deve ser posterior à data de início',
    path: ['endDate'],
  })

export const listPoliciesQuery = paginationQuery().extend({
  status: policyStatusEnum.optional(),
  clientId: z.string().optional(),
  proposalId: z.string().optional(),
  branch: branchEnum.optional(),
  search: z.string().optional(),
})

export const cancelPolicyBody = z.object({
  reason: z.string().min(1),
})

export const importJobIdParam = z.object({
  jobId: z.string().uuid(),
})

export const generatePdfQuery = z.object({
  force: z.string().optional(),
})

// ── Response schemas (OpenAPI) ────────────────────────────────────

const policyDetailSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  proposalId: z.string(),
  clientId: z.string(),
  salespersonId: z.string(),
  policyNumber: z.string(),
  status: policyStatusEnum,
  branch: branchEnum,
  premiumValueInCents: z.number(),
  coverageDetails: z.record(z.unknown()).nullable(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  cancelledAt: z.coerce.date().nullable(),
  cancelReason: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  clientName: z.string().optional(),
  clientDocument: z.string().optional(),
  salespersonName: z.string().optional(),
  insurerName: z.string().optional(),
  proposalIdentifier: z.string().optional(),
})

/** List returns the same shape — handler sends full PolicyData items */
export const policyListResponse = z.object({
  success: z.literal(true),
  data: z.array(policyDetailSchema),
  meta: z.object({
    nextCursor: z.string().nullable(),
  }),
})

export const policyDetailResponse = successResponse(policyDetailSchema)

const pdfDataSchema = z.object({
  url: z.string(),
  cached: z.boolean(),
})

export const policyPdfResponse = successResponse(pdfDataSchema)

// ── Import response schemas ───────────────────────────────────────

const csvRowErrorSchema = z.object({
  row: z.number(),
  field: z.string(),
  message: z.string(),
  value: z.string().optional(),
})

const importUploadDataSchema = z.object({
  jobId: z.string().uuid(),
  preview: z.array(z.record(z.string())).readonly(),
  validationSummary: z.object({
    total: z.number(),
    valid: z.number(),
    invalid: z.number(),
    errors: z.array(csvRowErrorSchema).readonly(),
  }),
})

export const importUploadResponse = successResponse(importUploadDataSchema)

const importConfirmDataSchema = z.object({
  jobId: z.string().uuid(),
})

export const importConfirmResponse = successResponse(importConfirmDataSchema)

const importStatusDataSchema = z.object({
  status: z.enum(['active', 'completed', 'failed', 'waiting', 'not_found']),
  progress: z.record(z.unknown()).nullable(),
})

export const importStatusResponse = successResponse(importStatusDataSchema)

export { errorResponse }
