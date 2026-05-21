import { z } from 'zod'

export const BRANCH_VALUES = [
  'AUTO',
  'RESIDENTIAL',
  'CONDOMINIUM',
  'BUSINESS',
  'LIFE',
  'OTHER',
] as const

export const branchEnum = z.enum(BRANCH_VALUES)
export type Branch = (typeof BRANCH_VALUES)[number]

export const BUSINESS_SEGMENT_VALUES = [
  'INDUSTRY',
  'RETAIL',
  'WHOLESALE',
  'WAREHOUSE_LOGISTICS',
  'CONSTRUCTION',
  'HEALTH_CLINIC',
  'EDUCATION',
  'HOSPITALITY_RESTAURANT',
  'PROFESSIONAL_SERVICES',
  'TECHNOLOGY',
  'CONSULTING',
  'OTHER',
] as const

export const businessSegmentSchema = z.enum(BUSINESS_SEGMENT_VALUES)
export type BusinessSegment = (typeof BUSINESS_SEGMENT_VALUES)[number]

const BUSINESS_SEGMENT_VALUES_SET: ReadonlySet<string> = new Set(
  BUSINESS_SEGMENT_VALUES
)

const BUSINESS_SEGMENTS_WITHOUT_AREA: ReadonlySet<BusinessSegment> = new Set([
  'PROFESSIONAL_SERVICES',
  'TECHNOLOGY',
  'CONSULTING',
])

export function isBusinessSegment(value: unknown): value is BusinessSegment {
  return typeof value === 'string' && BUSINESS_SEGMENT_VALUES_SET.has(value)
}

export function shouldShowAreaM2(
  segment: BusinessSegment | null | undefined
): boolean {
  if (!segment) return true
  return !BUSINESS_SEGMENTS_WITHOUT_AREA.has(segment)
}

const autoDetailsSchema = z.object({
  branch: z.literal('AUTO'),
  vehicle: z.string().trim().min(1, 'Veículo é obrigatório').max(100),
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
  street: z.string().trim().optional(),
  number: z.string().trim().optional(),
  complement: z.string().trim().optional(),
  neighborhood: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().length(2).optional(),
  construction: z.string().optional(),
  areaM2: z.number().optional(),
})

const condominiumDetailsSchema = z.object({
  branch: z.literal('CONDOMINIUM'),
  condominiumName: z.string().min(1),
  unitCount: z.number().int().min(1),
  cep: z.string().min(1),
  street: z.string().trim().optional(),
  number: z.string().trim().optional(),
  complement: z.string().trim().optional(),
  neighborhood: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().length(2).optional(),
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

export const businessDetailsSchema = z.object({
  branch: z.literal('BUSINESS'),
  legalName: z.string().min(1),
  cnpj: z.string().min(1),
  businessActivity: z.string().min(1),
  businessSegment: businessSegmentSchema.nullable().optional(),
  cep: z.string().optional(),
  street: z.string().trim().optional(),
  number: z.string().trim().optional(),
  complement: z.string().trim().optional(),
  neighborhood: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().length(2).optional(),
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

export const insuredObjectDetailsSchema = z.discriminatedUnion('branch', [
  autoDetailsSchema,
  residentialDetailsSchema,
  condominiumDetailsSchema,
  businessDetailsSchema,
  lifeDetailsSchema,
  otherDetailsSchema,
])

export type AutoDetails = z.infer<typeof autoDetailsSchema>
export type ResidentialDetails = z.infer<typeof residentialDetailsSchema>
export type CondominiumDetails = z.infer<typeof condominiumDetailsSchema>
export type BusinessDetails = z.infer<typeof businessDetailsSchema>
export type LifeDetails = z.infer<typeof lifeDetailsSchema>
export type OtherDetails = z.infer<typeof otherDetailsSchema>
export type InsuredObjectDetails = z.infer<typeof insuredObjectDetailsSchema>

export function isInsuredObjectDetails(
  value: unknown
): value is InsuredObjectDetails {
  return insuredObjectDetailsSchema.safeParse(value).success
}
