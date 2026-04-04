import { z } from 'zod'
import { paginationQuery } from '../../_shared/pagination.schema.js'
import { idParam } from '../../_shared/params.schema.js'
import { branchEnum } from '../../_shared/enums.schema.js'
import {
  successResponse,
  errorResponse,
} from '../../_shared/response.schema.js'

// ── Entity-specific enums ───────────────────────────────────────────

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

// ── Param schemas ───────────────────────────────────────────────────

export { idParam }

export const checklistItemIdParam = z.object({
  id: z.string().min(1),
  itemId: z.string().min(1),
})

// ── Body schemas ────────────────────────────────────────────────────

const createNewInsuranceOrRenewalProposalBody = z.object({
  clientId: z.string().min(1),
  branch: branchEnum,
  boardType: z.enum(['NEW_INSURANCE', 'RENEWAL']),
  renewalPolicyId: z.string().optional(),
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

// ── Insured object details (discriminated union by branch) ──────────

const autoDetailsSchema = z.object({
  branch: z.literal('AUTO'),
  brand: z.string().min(1),
  model: z.string().min(1),
  manufacturingYear: z.number().int().min(1900).max(2100),
  modelYear: z.number().int().min(1900).max(2100),
  licensePlate: z.string().optional(),
  vin: z.string().optional(),
  color: z.string().optional(),
  fuelType: z.string().optional(),
  vehicleUsage: z.string().optional(),
})

const residentialDetailsSchema = z.object({
  branch: z.literal('RESIDENTIAL'),
  propertyType: z.string().min(1),
  propertyUsage: z.string().min(1),
  cep: z.string().min(1),
  address: z.string().optional(),
  construction: z.string().optional(),
  areaM2: z.number().optional(),
})

const condominiumDetailsSchema = z.object({
  branch: z.literal('CONDOMINIUM'),
  condominiumName: z.string().min(1),
  unitCount: z.number().int().min(1),
  cep: z.string().min(1),
  address: z.string().optional(),
  constructionYear: z.number().int().optional(),
  floorCount: z.number().int().optional(),
  blockCount: z.number().int().optional(),
  elevatorCount: z.number().int().optional(),
  employeeCount: z.number().int().optional(),
  hasSecurityEquipment: z.boolean().optional(),
  securityEquipmentDetails: z.string().optional(),
  hasFireEquipment: z.boolean().optional(),
  fireEquipmentDetails: z.string().optional(),
})

const businessDetailsSchema = z.object({
  branch: z.literal('BUSINESS'),
  legalName: z.string().min(1),
  cnpj: z.string().min(1),
  businessActivity: z.string().min(1),
  cep: z.string().optional(),
  address: z.string().optional(),
  areaM2: z.number().optional(),
})

const lifeDetailsSchema = z.object({
  branch: z.literal('LIFE'),
  occupation: z.string().min(1),
  monthlyIncomeCents: z.number().int().min(0).optional(),
  isSmoker: z.boolean().optional(),
  extremeSports: z.boolean().optional(),
  heightInCentimeters: z.number().int().min(100).max(250).optional(),
  weightInGrams: z.number().int().min(20000).max(300000).optional(),
  beneficiaries: z.string().optional(),
})

const otherDetailsSchema = z.object({
  branch: z.literal('OTHER'),
  description: z.string().min(1),
})

export const insuredObjectDetails = z.discriminatedUnion('branch', [
  autoDetailsSchema,
  residentialDetailsSchema,
  condominiumDetailsSchema,
  businessDetailsSchema,
  lifeDetailsSchema,
  otherDetailsSchema,
])

export const updateProposalDetailsBody = z.object({
  details: insuredObjectDetails,
  premiumValueInCents: z.number().int().min(0),
  commissionBasisPoints: z.number().int().min(0).max(10000),
  insurerId: z.string().optional().nullable(),
})

// ── Query schemas ───────────────────────────────────────────────────

export const listProposalsQuery = paginationQuery().extend({
  stage: proposalStageEnum.optional(),
  clientId: z.string().optional(),
  salespersonId: z.string().optional(),
  insurerId: z.string().optional(),
  sourcePolicyId: z.string().optional(),
  createdFrom: z.coerce.date().optional(),
  createdTo: z.coerce.date().optional(),
  boardType: boardTypeEnum.optional(),
  search: z.string().optional(),
})

// ── Response schemas (typed for OpenAPI) ────────────────────────────

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
  clientId: z.string(),
  salespersonId: z.string(),
  stage: proposalStageEnum,
  boardType: boardTypeEnum,
  branch: branchEnum,
  premiumValueInCents: z.number(),
  commissionPercentageInCents: z.number(),
  details: insuredObjectDetails.nullable(),
  lostReason: z.string().nullable(),
  renewalPolicyId: z.string().nullable(),
  sourcePolicyId: z.string().nullable(),
  endorsementType: z.string().nullable(),
  endorsementReason: z.string().nullable(),
  sourcePolicySnapshot: sourcePolicySnapshotSchema.nullable(),
  insurerId: z.string().nullable(),
  deletedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  clientName: z.string().optional(),
  clientDocument: z.string().optional(),
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

export { errorResponse }
