import { z } from 'zod';

const ASSISTANCE_STATUS_VALUES = [
  'REQUESTED',
  'AWAITING_DOCUMENT',
  'PENDING_INSPECTION',
  'DISPATCHED',
  'IN_PROGRESS',
  'COMPLETED',
] as const;

const emptyToUndefined = z.literal('').transform(() => undefined);

const optionalString = z.union([emptyToUndefined, z.string()]).optional();

const optionalDate = z.union([emptyToUndefined, z.coerce.date()]).optional();

export const createAssistanceBodySchema = z.object({
  policyId: z.string().min(1),
  clientId: z.string().min(1),
  claimId: optionalString,
  type: z.string().min(1),
  description: optionalString,
  address: optionalString,
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  providerName: optionalString,
  providerPhone: optionalString,
  scheduledAt: optionalDate,
});

export const updateAssistanceStatusBodySchema = z.object({
  status: z.enum(ASSISTANCE_STATUS_VALUES),
});

export const listAssistancesQuerySchema = z.object({
  status: z.enum(ASSISTANCE_STATUS_VALUES).optional(),
  policyId: z.string().optional(),
  clientId: z.string().optional(),
  type: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});
