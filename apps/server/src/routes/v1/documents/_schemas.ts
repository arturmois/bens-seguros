import { z } from 'zod'

import { idParam } from '../../_shared/params.schema.js'
import { successResponse } from '../../_shared/response.schema.js'

const DOCUMENT_ENTITY_TYPE_VALUES = [
  'CLIENT',
  'PROPOSAL',
  'POLICY',
  'CLAIM',
  'ASSISTANCE',
] as const

const DOCUMENT_TYPE_VALUES = [
  'DRIVER_LICENSE',
  'VEHICLE_REGISTRATION',
  'HEALTH_DECLARATION',
  'PROOF_OF_ADDRESS',
  'SOCIAL_CONTRACT',
  'CNPJ_CARD',
  'POLICY_PDF',
  'QUOTATION_PDF',
  'CLAIM_PHOTO',
  'CLAIM_REPORT',
  'PROOF_OF_PAYMENT',
  'CONTRACT',
  'OTHER',
] as const

export const listDocumentsQuerySchema = z.object({
  entityType: z.enum(DOCUMENT_ENTITY_TYPE_VALUES),
  entityId: z.string().min(1),
})

export const uploadDocumentQuerySchema = z.object({
  entityType: z.enum(DOCUMENT_ENTITY_TYPE_VALUES),
  entityId: z.string().min(1),
  clientId: z.string().optional(),
  type: z.enum(DOCUMENT_TYPE_VALUES).optional(),
})

export { idParam as idParamSchema }

// --- Response schemas ---

const documentSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  entityType: z.enum(DOCUMENT_ENTITY_TYPE_VALUES),
  entityId: z.string(),
  clientId: z.string().nullable(),
  type: z.enum(DOCUMENT_TYPE_VALUES),
  fileName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  storageKey: z.string(),
  url: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.coerce.date(),
})

export const documentDetailResponse = successResponse(documentSchema)
export const documentListResponse = successResponse(z.array(documentSchema))
export const documentUrlResponse = successResponse(
  z.object({ url: z.string() })
)
