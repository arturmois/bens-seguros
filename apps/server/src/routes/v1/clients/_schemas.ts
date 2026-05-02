import { z } from 'zod'

import { maritalStatusEnum } from '../../shared/enums.schema.js'
import { idParam } from '../../shared/params.schema.js'
import {
  errorResponse,
  paginatedResponse,
  successResponse,
} from '../../shared/response.schema.js'

export const PERSON_TYPE_VALUES = ['INDIVIDUAL', 'COMPANY'] as const

export const personTypeEnum = z.enum(PERSON_TYPE_VALUES)

// --- Body schemas ---

export const updateClientBodySchema = z.object({
  legalName: z.string().trim().min(1).optional(),
  personType: personTypeEnum.optional(),
  profession: z.string().nullable().optional(),
  maritalStatus: maritalStatusEnum.nullable().optional(),
  address: z.record(z.string(), z.unknown()).nullable().optional(),
  fiscalBirthDate: z.coerce.date().nullable().optional(),
})

// --- Query schemas ---

export const listClientsQuerySchema = z.object({
  hasActivePolicy: z.coerce.boolean().optional(),
  search: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'legalName']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export { idParam as idParamSchema }

export const importJobIdParamSchema = z.object({
  jobId: z.string().uuid(),
})

// --- Response schemas (OpenAPI) ---

export const clientWithMetricsSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  legalName: z.string(),
  document: z.string(),
  personType: personTypeEnum,
  profession: z.string().nullable(),
  maritalStatus: maritalStatusEnum.nullable(),
  address: z.record(z.string(), z.unknown()).nullable(),
  fiscalBirthDate: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable(),
  activePolicyCount: z.number().int(),
  totalPolicyCount: z.number().int(),
  contactCount: z.number().int(),
})

export const clientDataSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  legalName: z.string(),
  document: z.string(),
  personType: personTypeEnum,
  profession: z.string().nullable(),
  maritalStatus: maritalStatusEnum.nullable(),
  address: z.record(z.string(), z.unknown()).nullable(),
  fiscalBirthDate: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable(),
})

export const clientListResponse = paginatedResponse(clientWithMetricsSchema)
export const clientDetailResponse = successResponse(clientWithMetricsSchema)
export const clientUpdateResponse = successResponse(clientDataSchema)
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
