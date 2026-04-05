import { z } from 'zod'

import { successResponse } from '../../_shared/response.schema.js'

export const createLeadBodySchema = z.object({
  clientName: z.string().min(1),
  clientPhone: z.string().min(1),
  insuranceType: z.string(),
  notes: z.string().optional(),
  source: z.string().optional(),
})

// --- Response schemas ---

export const createLeadResponse = successResponse(
  z.object({
    proposalId: z.string(),
    clientId: z.string(),
    message: z.string(),
  })
)

export const searchClientsQuerySchema = z.object({
  phone: z.string().optional(),
  document: z.string().optional(),
})

export const searchClientsResponse = successResponse(
  z.object({
    found: z.boolean(),
    client: z
      .object({
        id: z.string(),
        name: z.string(),
        type: z.enum(['LEAD', 'CLIENT', 'FORMER_CLIENT']),
        email: z.string().nullable(),
        phone: z.string().nullable(),
        hasActivePolicy: z.boolean(),
        activePoliciesCount: z.number(),
        openProposalsCount: z.number(),
      })
      .nullable(),
  })
)

export const updateClientParamsSchema = z.object({
  id: z.string().min(1),
})

export const updateClientBodySchema = z.object({
  document: z.string().optional(),
  email: z.string().email().optional(),
  address: z
    .object({
      zipCode: z.string().optional(),
      street: z.string().optional(),
      number: z.string().optional(),
      complement: z.string().optional(),
      neighborhood: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
    })
    .optional(),
  birthDate: z.string().optional(),
  profession: z.string().optional(),
  maritalStatus: z
    .enum(['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'OTHER'])
    .optional(),
})

export const updateClientResponse = successResponse(
  z.object({ success: z.boolean(), message: z.string() })
)

const INSURANCE_BRANCH_VALUES = [
  'AUTO',
  'RESIDENTIAL',
  'LIFE',
  'BUSINESS',
  'TRAVEL',
  'CONDOMINIUM',
  'OTHER',
] as const

export const createInternalClaimBodySchema = z.object({
  phoneOrDocument: z.string().min(1),
  description: z.string().min(1),
  incidentDate: z.string().optional(),
  incidentLocation: z.string().optional(),
  insuranceType: z.enum(INSURANCE_BRANCH_VALUES).optional(),
})

export const createInternalClaimResponse = successResponse(
  z.object({
    claimCreated: z.boolean(),
    claimNumber: z.string().nullable(),
    dataSaved: z.boolean(),
    claimData: z.record(z.unknown()).nullable(),
    message: z.string(),
  })
)
