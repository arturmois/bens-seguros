import { ContactSource } from '@repo/db'
import { z } from 'zod'
import { csvEnumArray, csvStringArray } from '../../shared/csv-array.schema.js'

export const CONTACT_STAGES = [
  'LEAD',
  'CLIENT_ACTIVE',
  'CLIENT_INACTIVE',
] as const

export const PERSON_TYPES = ['INDIVIDUAL', 'COMPANY'] as const

export const MARITAL_STATUSES = [
  'SINGLE',
  'MARRIED',
  'DIVORCED',
  'WIDOWED',
  'OTHER',
] as const

export const contactSourceEnum = z.nativeEnum(ContactSource)
export const contactStageEnum = z.enum(CONTACT_STAGES)
export const personTypeEnum = z.enum(PERSON_TYPES)
export const maritalStatusEnum = z.enum(MARITAL_STATUSES)

export const contactParams = z.object({ id: z.string().min(1) })

export const createContactBody = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório'),
  phone: z
    .string()
    .trim()
    .refine(
      (value) => value.replace(/\D/g, '').length === 13,
      'Telefone incompleto'
    ),
  email: z.string().trim().email('Email inválido').optional(),
  source: contactSourceEnum,
  salespersonId: z.string().min(1).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  consentLgpd: z.boolean(),
  birthDate: z.coerce.date().optional(),
  socialMedia: z.record(z.string(), z.unknown()).optional(),
})

export const updateContactBody = z.object({
  name: z.string().trim().min(1).optional(),
  phone: z
    .string()
    .trim()
    .refine(
      (value) => value.replace(/\D/g, '').length === 13,
      'Telefone incompleto'
    )
    .optional(),
  email: z.string().trim().email().nullable().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().nullable().optional(),
  birthDate: z.coerce.date().nullable().optional(),
  socialMedia: z.record(z.string(), z.unknown()).nullable().optional(),
  salespersonId: z.string().min(1).optional(),
})

export const promoteContactBody = z.object({
  document: z.string().trim().min(11),
  legalName: z.string().trim().min(1).optional(),
  personType: personTypeEnum.optional(),
  profession: z.string().optional(),
  maritalStatus: maritalStatusEnum.optional(),
  address: z.record(z.string(), z.unknown()).optional(),
  fiscalBirthDate: z.coerce.date().optional(),
})

export const listContactsQuery = z.object({
  stage: contactStageEnum.optional(),
  source: contactSourceEnum.optional(),
  salespersonId: z.string().optional(),
  stageIn: csvEnumArray(contactStageEnum).optional(),
  sourceIn: csvEnumArray(contactSourceEnum).optional(),
  salespersonIdIn: csvStringArray().optional(),
  consentLgpd: z
    .union([z.literal('true'), z.literal('false')])
    .transform((v) => v === 'true')
    .optional(),
  createdFrom: z.coerce.date().optional(),
  createdTo: z.coerce.date().optional(),
  search: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export const contactDataSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  source: contactSourceEnum,
  salespersonId: z.string(),
  clientId: z.string().nullable(),
  tags: z.array(z.string()),
  socialMedia: z.record(z.string(), z.unknown()).nullable(),
  notes: z.string().nullable(),
  consentLgpd: z.boolean(),
  birthDate: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable(),
})

export const contactWithStageSchema = contactDataSchema.extend({
  stage: contactStageEnum,
  activePolicyCount: z.number().int(),
})

export const contactDetailResponse = z.object({
  success: z.literal(true),
  data: contactWithStageSchema,
})

export const contactListResponse = z.object({
  success: z.literal(true),
  data: z.array(contactWithStageSchema),
  meta: z.object({ nextCursor: z.string().nullable() }),
})

export const promoteContactResponse = z.object({
  success: z.literal(true),
  data: z.object({
    clientId: z.string(),
    legalName: z.string(),
    document: z.string(),
  }),
})

export const errorResponse = z.object({
  success: z.literal(false),
  error: z.object({ code: z.string(), message: z.string() }),
})
