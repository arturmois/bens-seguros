import { z } from 'zod'

const dateRegex = /^\d{4}-\d{2}-\d{2}$/

const phoneSchema = z.object({
  areaCode: z.string().min(2).max(2),
  number: z.string().min(8).max(9),
})

const insuredPersonSchema = z.object({
  cpf: z.string(),
  fullName: z.string(),
  birthDate: z.string().regex(dateRegex),
  gender: z.enum(['MALE', 'FEMALE']),
  maritalStatus: z.enum([
    'MARRIED',
    'DIVORCED',
    'SEPARATED',
    'SINGLE',
    'WIDOWED',
  ]),
  cep: z.string(),
  email: z.string().email(),
  cellPhone: phoneSchema.nullable(),
  homePhone: phoneSchema.nullable(),
})

const vehicleSchema = z.object({
  licensePlate: z.string().optional(),
  model: z.string(),
  manufacturer: z.string(),
  manufactureYear: z.number().int(),
  modelYear: z.number().int(),
  fipeCode: z.string(),
  isZeroKm: z.boolean(),
  fuelType: z.enum([
    'FLEX',
    'GASOLINE',
    'ALCOHOL',
    'DIESEL',
    'HYBRID',
    'TETRAFUEL',
    'ELECTRIC',
  ]),
  overnightCep: z.string(),
  tracker: z.enum([
    'NONE',
    'AUTOTRAC',
    'CAR_SYSTEM',
    'CELTEC',
    'CIELO',
    'GRABER',
    'ITURAN',
    'TRACKER',
    'OMNILINK',
    'POSITRON',
    'SASCAR',
    'DAF_V',
    'CEABS',
    'ONSTAR',
    'LO_JACK',
    'FACTORY_ORIGINAL',
    'SEGSAT',
    'SAT_COMPANY',
  ]),
  antitheft: z.enum([
    'NONE',
    'ALARM',
    'IGNITION_BLOCKER',
    'CARNEIRO_LOCK',
    'MULT_LOCK',
    'OTHER',
  ]),
  isFinanced: z.boolean(),
  hasGasKit: z.boolean(),
  isArmored: z.boolean(),
  chassisNumber: z.string().optional(),
})

const questionnaireSchema = z.object({
  residenceType: z.enum(['HOUSE', 'APARTMENT', 'CONDOMINIUM', 'OTHER']),
  residenceGarage: z.enum(['ELECTRONIC_GATE', 'MANUAL_GATE', 'NO_GARAGE']),
  workGarage: z.enum(['NOT_APPLICABLE', 'NO', 'YES', 'NOT_WORKING']),
  studyGarage: z.enum(['NOT_APPLICABLE', 'NO', 'YES', 'NOT_STUDENT']),
  vehicleUsage: z.enum(['PERSONAL', 'PROFESSIONAL', 'TAXI', 'APP_DRIVER']),
  monthlyMileage: z.number().int().nonnegative(),
  isPcd: z.boolean(),
  livesWithUnder26: z.boolean(),
  profession: z.string().optional(),
  workDistance: z.string().optional(),
  usagePeriod: z.string().optional(),
})

const insuranceSchema = z.object({
  type: z.enum(['NEW', 'RENEWAL']),
  startDate: z.string().regex(dateRegex),
  endDate: z.string().regex(dateRegex),
  commission: z.number(),
  bonus: z.string().optional(),
  previousInsurer: z.string().optional(),
  previousPolicyNumber: z.string().optional(),
  hasClaims: z.boolean().optional(),
  observations: z.string().optional(),
})

const mainDriverSchema = z.object({
  cpf: z.string(),
  fullName: z.string(),
  birthDate: z.string().regex(dateRegex),
  gender: z.enum(['MALE', 'FEMALE']),
  maritalStatus: z.enum([
    'MARRIED',
    'DIVORCED',
    'SEPARATED',
    'SINGLE',
    'WIDOWED',
  ]),
  licenseYears: z.number().int().nonnegative().optional(),
  relationship: z.enum([
    'SELF',
    'SPOUSE',
    'EMPLOYEE',
    'SIBLING',
    'CHILD',
    'MOTHER',
    'FATHER',
    'OTHER',
  ]),
})

export const autoQuoteInputSchema = z.object({
  brokerId: z.number().int().positive(),
  insuranceBroker: z.string(),
  insured: insuredPersonSchema,
  vehicle: vehicleSchema,
  questionnaire: questionnaireSchema,
  insurance: insuranceSchema,
  mainDriver: mainDriverSchema,
})
