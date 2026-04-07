import { z } from 'zod'

import { maritalStatusEnum } from '../../shared/enums.schema.js'
import { paginationQuery } from '../../shared/pagination.schema.js'
import { idParam } from '../../shared/params.schema.js'
import {
  errorResponse,
  paginatedResponse,
  successResponse,
} from '../../shared/response.schema.js'
import {
  optionalDate,
  optionalEmail,
  optionalString,
} from '../../shared/transforms.js'

const CLIENT_TYPE_VALUES = ['LEAD', 'CLIENT', 'FORMER_CLIENT'] as const
export const PERSON_TYPE_VALUES = ['INDIVIDUAL', 'COMPANY'] as const

const socialMediaSchema = z
  .object({
    instagram: optionalString,
    facebook: optionalString,
    linkedin: optionalString,
    tiktok: optionalString,
  })
  .optional()

const createClientBodyBase = z.object({
  name: z.string().trim().min(2),
  document: z.string().trim().min(11).max(14),
  personType: z.enum(PERSON_TYPE_VALUES).default('INDIVIDUAL'),
  type: z.enum(CLIENT_TYPE_VALUES).optional(),
  email: optionalEmail,
  phone: optionalString,
  birthDate: optionalDate,
  profession: optionalString,
  maritalStatus: maritalStatusEnum.optional(),
  address: z.record(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  consentLgpd: z.boolean().optional(),
  socialMedia: socialMediaSchema,
})

export const createClientBodySchema = createClientBodyBase.refine(
  (data) => {
    const digits = data.document.replace(/\D/g, '')
    if (data.personType === 'COMPANY') return digits.length === 14
    return digits.length === 11
  },
  {
    message: 'Documento inválido para o tipo de pessoa selecionado',
    path: ['document'],
  }
)

export const updateClientBodySchema = createClientBodyBase
  .partial()
  .omit({ document: true, personType: true })

export const listClientsQuerySchema = paginationQuery().extend({
  type: z.enum(CLIENT_TYPE_VALUES).optional(),
  search: z.string().optional(),
})

export { idParam as idParamSchema }

export const importJobIdParamSchema = z.object({
  jobId: z.string().uuid(),
})

// --- Response schemas (OpenAPI) ---

const clientListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(CLIENT_TYPE_VALUES),
  personType: z.enum(PERSON_TYPE_VALUES),
  tags: z.array(z.string()),
  document: z.string(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
  socialMedia: socialMediaSchema.nullable(),
})

const clientDetailSchema = clientListItemSchema.extend({
  consentLgpd: z.boolean(),
  updatedAt: z.coerce.date(),
  birthDate: z.coerce.date().nullable().optional(),
  profession: z.string().nullable().optional(),
  maritalStatus: maritalStatusEnum.nullable().optional(),
  address: z.record(z.string().optional()).nullable().optional(),
})

export const clientListResponse = paginatedResponse(clientListItemSchema)
export const clientDetailResponse = successResponse(clientDetailSchema)
export const deleteResponse = z.void()
export { errorResponse }

// --- Import response schemas (OpenAPI) ---

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
