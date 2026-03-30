import { z } from 'zod'
import { paginationQuery } from '../../_shared/pagination.schema.js'
import { idParam } from '../../_shared/params.schema.js'
import { branchEnum } from '../../_shared/enums.schema.js'

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

export const BOARD_TYPE_VALUES = ['NEW_INSURANCE', 'RENEWAL'] as const

export const boardTypeEnum = z.enum(BOARD_TYPE_VALUES)

// ── Param schemas ───────────────────────────────────────────────────

export { idParam }

export const checklistItemIdParam = z.object({
  id: z.string().min(1),
  itemId: z.string().min(1),
})

// ── Body schemas ────────────────────────────────────────────────────

export const createProposalBody = z.object({
  clientId: z.string().min(1),
  branch: branchEnum,
  boardType: boardTypeEnum,
  renewalPolicyId: z.string().optional(),
  insurerId: z.string().optional(),
})

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
  boardType: boardTypeEnum.optional(),
  search: z.string().optional(),
})

// ── Response schemas (for OpenAPI) ──────────────────────────────────

export const proposalResponse = z.object({
  success: z.literal(true),
  data: z.record(z.unknown()),
})

export const proposalListResponse = z.object({
  success: z.literal(true),
  data: z.array(z.record(z.unknown())),
  meta: z.object({ nextCursor: z.string().nullable() }),
})

export const proposalPdfResponse = z.object({
  success: z.literal(true),
  data: z.object({
    url: z.string(),
    cached: z.boolean(),
  }),
})

export const errorResponse = z.object({
  success: z.literal(false),
  error: z.object({ code: z.string(), message: z.string() }),
})
