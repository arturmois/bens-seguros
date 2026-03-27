import { z } from 'zod'

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

export const insuredObjectDetailsSchema = z.discriminatedUnion('branch', [
  autoDetailsSchema,
  residentialDetailsSchema,
  condominiumDetailsSchema,
  businessDetailsSchema,
  lifeDetailsSchema,
  otherDetailsSchema,
])

export const updateProposalDetailsBodySchema = z.object({
  details: insuredObjectDetailsSchema,
  premiumValueInCents: z.number().int().min(0),
  commissionBasisPoints: z.number().int().min(0).max(10000),
})
