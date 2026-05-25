export const PROVIDER_NAMES = ['asaas', 'stripe', 'manual'] as const

export type ProviderName = (typeof PROVIDER_NAMES)[number]

export type BillingPeriod = 'monthly' | 'yearly'

export type CustomerRef = {
  provider: ProviderName
  externalId: string
}

export type SubscriptionRef = {
  provider: ProviderName
  externalId: string
  customerRef: CustomerRef
}

export type PlanRef = {
  provider: ProviderName
  externalId?: string
  priceCents: number
  currency: string
  billingPeriod: BillingPeriod
}

export type PaymentMethodRef = {
  provider: ProviderName
  externalId: string
  token: string
  brand?: string
  last4?: string
  expiryMonth?: number
  expiryYear?: number
}

export type CreateCustomerInput = {
  name: string
  email: string
  taxId?: string
  externalRef?: string
}

export type CreateSubscriptionInput = {
  customerRef: CustomerRef
  planRef: PlanRef
  paymentMethodRef?: PaymentMethodRef
  trialEndsAt?: Date
}

export type TokenizeInput = {
  customerRef: CustomerRef
  providerPaymentMethodId: string
}
