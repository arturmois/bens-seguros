import { z } from 'zod'
import {
  PROVIDER_NAMES,
  type BillingPeriod,
  type CanonicalEventType,
} from '@repo/billing-port'

export const PlanRefSchema = z.object({
  provider: z.enum(PROVIDER_NAMES),
  externalId: z.string().optional(),
  priceCents: z.number().int().nonnegative(),
  currency: z.string().length(3),
  billingPeriod: z.enum(['monthly', 'yearly']),
})

export function centsToDecimal(cents: number): number {
  return cents / 100
}

export function decimalToCents(decimal: number): number {
  return Math.round(decimal * 100)
}

type AsaasCycle = 'MONTHLY' | 'YEARLY'

export function domainCycleToAsaas(period: BillingPeriod): AsaasCycle {
  return period === 'monthly' ? 'MONTHLY' : 'YEARLY'
}

const ASAAS_EVENT_MAP: Record<string, CanonicalEventType> = {
  PAYMENT_RECEIVED: 'PAYMENT_SUCCEEDED',
  PAYMENT_CONFIRMED: 'PAYMENT_SUCCEEDED',
  PAYMENT_OVERDUE: 'PAYMENT_FAILED',
  PAYMENT_REFUNDED: 'PAYMENT_REFUNDED',
  SUBSCRIPTION_DELETED: 'SUBSCRIPTION_CANCELED_BY_PROVIDER',
}

export function asaasEventToCanonicalType(
  asaasEvent: string
): CanonicalEventType | null {
  return ASAAS_EVENT_MAP[asaasEvent] ?? null
}
