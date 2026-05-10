import { insuredObjectDetailsSchema } from '@repo/shared'
import { z } from 'zod'

import { csvEnumArray } from '../../shared/csv-array.schema.js'
import { branchEnum } from '../../shared/enums.schema.js'
import { paginationQuery } from '../../shared/pagination.schema.js'
import { idParam } from '../../shared/params.schema.js'
import { errorResponse, successResponse } from '../../shared/response.schema.js'

export const insuredObjectDetails = insuredObjectDetailsSchema

export const PROPOSAL_STAGE_VALUES = [
  'CAPTURE',
  'QUOTE',
  'PROTOCOL',
  'INSPECTION',
  'PAYMENT',
  'POLICY_ISSUED',
  'LOST',
] as const

export const proposalStageEnum = z.enum(PROPOSAL_STAGE_VALUES)

export const BOARD_TYPE_VALUES = [
  'NEW_INSURANCE',
  'RENEWAL',
  'ENDORSEMENT',
] as const

export const boardTypeEnum = z.enum(BOARD_TYPE_VALUES)

export const proposalSortByEnum = z.enum([
  'clientName',
  'branch',
  'stage',
  'boardType',
  'premiumValueInCents',
  'createdAt',
])

export { idParam }

export const checklistItemIdParam = z.object({
  id: z.string().min(1),
  itemId: z.string().min(1),
})

const createNewInsuranceOrRenewalProposalBody = z.object({
  contactId: z.string().min(1),
  branch: branchEnum,
  boardType: z.enum(['NEW_INSURANCE', 'RENEWAL']),
  renewalPolicyId: z.string().optional(),
  renewalPolicyNumber: z.string().trim().optional(),
  insurerId: z.string().optional(),
})

const createEndorsementProposalBody = z.object({
  boardType: z.literal('ENDORSEMENT'),
  sourcePolicyId: z.string().min(1),
  endorsementType: z.string().min(1),
  endorsementReason: z.string().min(1),
})

export const createProposalBody = z.discriminatedUnion('boardType', [
  createNewInsuranceOrRenewalProposalBody,
  createEndorsementProposalBody,
])

export const markLostBody = z.object({
  reason: z.string().min(1),
})

export const updateProposalDetailsBody = z.object({
  details: insuredObjectDetails,
  premiumValueInCents: z.number().int().min(0),
  commissionBasisPoints: z.number().int().min(0).max(10000),
  insurerId: z.string().optional().nullable(),
})

export const listProposalsQuery = paginationQuery().extend({
  stage: proposalStageEnum.optional(),
  contactId: z.string().optional(),
  clientId: z.string().optional(),
  salespersonId: z.string().optional(),
  insurerId: z.string().optional(),
  sourcePolicyId: z.string().optional(),
  boardType: boardTypeEnum.optional(),

  stageIn: csvEnumArray(proposalStageEnum).optional(),
  branchIn: csvEnumArray(branchEnum).optional(),
  salespersonIdIn: csvEnumArray(z.string().min(1)).optional(),

  createdFrom: z.coerce.date().optional(),
  createdTo: z.coerce.date().optional(),
  updatedAtFrom: z.coerce.date().optional(),
  updatedAtTo: z.coerce.date().optional(),

  search: z.string().optional(),
  sortBy: proposalSortByEnum.optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
})

const checklistItemSchema = z.object({
  id: z.string(),
  proposalId: z.string(),
  itemKey: z.string(),
  label: z.string(),
  isRequired: z.boolean(),
  isCompleted: z.boolean(),
  completedAt: z.coerce.date().nullable(),
  completedBy: z.string().nullable(),
  createdAt: z.coerce.date(),
})

const checklistSummarySchema = z.object({
  total: z.number(),
  completed: z.number(),
  required: z.number(),
  requiredCompleted: z.number(),
  canAdvance: z.boolean(),
})

const sourcePolicySnapshotSchema = z.object({
  policyNumber: z.string(),
  clientName: z.string(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  status: z.enum(['ACTIVE', 'CANCELLED', 'EXPIRED']),
  insurerId: z.string().nullable(),
  insurerName: z.string().nullable(),
})

const proposalDataSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  contactId: z.string(),
  salespersonId: z.string(),
  stage: proposalStageEnum,
  boardType: boardTypeEnum,
  branch: branchEnum,
  premiumValueInCents: z.number(),
  commissionPercentageInCents: z.number(),
  details: insuredObjectDetails.nullable(),
  lostReason: z.string().nullable(),
  renewalPolicyId: z.string().nullable(),
  renewalPolicyNumber: z.string().nullable(),
  sourcePolicyId: z.string().nullable(),
  endorsementType: z.string().nullable(),
  endorsementReason: z.string().nullable(),
  sourcePolicySnapshot: sourcePolicySnapshotSchema.nullable(),
  insurerId: z.string().nullable(),
  deletedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  coverageStartDate: z.coerce.date().nullable(),
  coverageEndDate: z.coerce.date().nullable(),
  sentToClientAt: z.coerce.date().nullable(),
  clientResponseAt: z.coerce.date().nullable(),
  quoteValidUntil: z.coerce.date().nullable(),
  clientName: z.string().optional(),
  clientDocument: z.string().optional(),
  clientPersonType: z.string().optional(),
  salespersonName: z.string().optional(),
  insurerName: z.string().optional(),
})

export const proposalDetailResponse = successResponse(proposalDataSchema)

export const proposalListResponse = z.object({
  success: z.literal(true),
  data: z.array(proposalDataSchema),
  meta: z.object({ nextCursor: z.string().nullable() }),
})

export const proposalNullResponse = successResponse(z.null())

export const proposalPdfResponse = successResponse(
  z.object({
    url: z.string(),
    cached: z.boolean(),
  })
)

export const checklistResponse = successResponse(
  z.object({
    items: z.array(checklistItemSchema),
    summary: checklistSummarySchema,
  })
)

export const checklistItemResponse = successResponse(checklistItemSchema)

export const updateProposalDatesBody = z.object({
  coverageStartDate: z.coerce.date().optional(),
  coverageEndDate: z.coerce.date().optional(),
  clientResponseAt: z.coerce.date().optional(),
  quoteValidUntil: z.coerce.date().optional(),
})

export const sendQuoteResponse = z.object({
  success: z.literal(true),
  data: z.object({ message: z.string() }),
})

export { errorResponse }
