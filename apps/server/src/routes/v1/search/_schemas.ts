import { z } from 'zod'

export const searchQuerySchema = z.object({
  q: z.string().min(2).max(100),
  limit: z.coerce.number().int().min(1).max(20).default(10),
})

export type SearchQuery = z.infer<typeof searchQuerySchema>

const searchClientSchema = z.object({
  id: z.string(),
  name: z.string(),
  document: z.string(),
  type: z.string(),
})

const searchProposalSchema = z.object({
  id: z.string(),
  stage: z.string(),
  branch: z.string(),
  clientName: z.string(),
})

const searchPolicySchema = z.object({
  id: z.string(),
  policyNumber: z.string(),
  branch: z.string(),
  clientName: z.string(),
})

const searchClaimSchema = z.object({
  id: z.string(),
  claimNumber: z.number(),
  status: z.string(),
  clientName: z.string(),
})

const searchDataSchema = z.object({
  clients: z.array(searchClientSchema),
  proposals: z.array(searchProposalSchema),
  policies: z.array(searchPolicySchema),
  claims: z.array(searchClaimSchema),
})

export const globalSearchResponse = z.object({
  success: z.literal(true),
  data: searchDataSchema,
  meta: z.object({
    query: z.string(),
    totalResults: z.number(),
  }),
})
