import { z } from 'zod'

import { PROVIDER_NAMES } from './types'

const baseFields = {
  provider: z.enum(PROVIDER_NAMES),
  externalId: z.string().min(1),
  occurredAt: z.coerce.date(),
  providerCustomerId: z.string().min(1),
  providerSubscriptionId: z.string().min(1),
}

const PaymentSucceededSchema = z.object({
  ...baseFields,
  type: z.literal('PAYMENT_SUCCEEDED'),
  providerPaymentId: z.string().min(1),
  amountCents: z.number().int().nonnegative(),
  currency: z.string().length(3),
})

const PaymentFailedSchema = z.object({
  ...baseFields,
  type: z.literal('PAYMENT_FAILED'),
  providerPaymentId: z.string().min(1),
  amountCents: z.number().int().nonnegative(),
  currency: z.string().length(3),
  reason: z.string().optional(),
})

const PaymentRefundedSchema = z.object({
  ...baseFields,
  type: z.literal('PAYMENT_REFUNDED'),
  providerPaymentId: z.string().min(1),
  refundedAmountCents: z.number().int().nonnegative(),
  currency: z.string().length(3),
})

const SubscriptionCanceledByProviderSchema = z.object({
  ...baseFields,
  type: z.literal('SUBSCRIPTION_CANCELED_BY_PROVIDER'),
})

export const CanonicalEventSchema = z.discriminatedUnion('type', [
  PaymentSucceededSchema,
  PaymentFailedSchema,
  PaymentRefundedSchema,
  SubscriptionCanceledByProviderSchema,
])

export type CanonicalEvent = z.infer<typeof CanonicalEventSchema>

export type CanonicalEventType = CanonicalEvent['type']
