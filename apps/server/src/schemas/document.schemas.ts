import { z } from 'zod'

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
