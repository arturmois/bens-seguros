import { z } from 'zod'
import { branchEnum } from '../../_shared/enums.schema.js'
import { idParam } from '../../_shared/params.schema.js'
import { paginationQuery } from '../../_shared/pagination.schema.js'

export { idParam }

export const POLICY_STATUS_VALUES = ['ACTIVE', 'CANCELLED', 'EXPIRED'] as const

export const policyStatusEnum = z.enum(POLICY_STATUS_VALUES)

export const issuePolicyBody = z
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

export const listPoliciesQuery = paginationQuery().extend({
  status: policyStatusEnum.optional(),
  clientId: z.string().optional(),
  proposalId: z.string().optional(),
  branch: branchEnum.optional(),
  search: z.string().optional(),
})

export const cancelPolicyBody = z.object({
  reason: z.string().min(1),
})

export const importJobIdParam = z.object({
  jobId: z.string().uuid(),
})

export const generatePdfQuery = z.object({
  force: z.string().optional(),
})
