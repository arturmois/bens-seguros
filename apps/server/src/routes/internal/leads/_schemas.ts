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
