import { z } from 'zod';

export const createProposalBodySchema = z.object({
  clientId: z.string().min(1),
  branch: z.enum(['AUTO', 'RESIDENTIAL', 'CONDOMINIUM', 'BUSINESS', 'LIFE', 'OTHER']),
  boardType: z.enum(['NEW_INSURANCE', 'RENEWAL']),
  renewalPolicyId: z.string().optional(),
});

export const listProposalsQuerySchema = z.object({
  stage: z
    .enum(['CAPTURE', 'QUOTE', 'PROTOCOL', 'INSPECTION', 'PAYMENT', 'POLICY_ISSUED', 'LOST'])
    .optional(),
  clientId: z.string().optional(),
  boardType: z.enum(['NEW_INSURANCE', 'RENEWAL']).optional(),
  search: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const markLostBodySchema = z.object({
  reason: z.string().min(1),
});
