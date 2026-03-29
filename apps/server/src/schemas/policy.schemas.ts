import { z } from 'zod'

export const issuePolicyBodySchema = z
  .object({
    proposalId: z.string().min(1),
    policyNumber: z.string().min(1),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    coverageDetails: z.record(z.unknown()).optional(),
  })
  .refine((d) => d.endDate > d.startDate, {
    message: 'Data de fim deve ser posterior à data de início',
    path: ['endDate'],
  })

export const listPoliciesQuerySchema = z.object({
  status: z.enum(['ACTIVE', 'CANCELLED', 'EXPIRED']).optional(),
  clientId: z.string().optional(),
  proposalId: z.string().optional(),
  branch: z
    .enum(['AUTO', 'RESIDENTIAL', 'CONDOMINIUM', 'BUSINESS', 'LIFE', 'OTHER'])
    .optional(),
  search: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
})

export const cancelPolicyBodySchema = z.object({
  reason: z.string().min(1),
})
