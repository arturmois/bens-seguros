import type { CanonicalEvent } from './canonical-event'
import type {
  CreateCustomerInput,
  CreateSubscriptionInput,
  CustomerRef,
  PaymentMethodRef,
  PlanRef,
  SubscriptionRef,
  TokenizeInput,
} from './types'

export interface BillingProvider {
  createCustomer(input: CreateCustomerInput): Promise<CustomerRef>

  createSubscription(input: CreateSubscriptionInput): Promise<SubscriptionRef>

  cancelSubscription(ref: SubscriptionRef): Promise<void>

  changeSubscriptionPlan(
    ref: SubscriptionRef,
    newPlan: PlanRef
  ): Promise<SubscriptionRef>

  tokenizeCard(input: TokenizeInput): Promise<PaymentMethodRef>

  validateAndParseWebhook(
    body: string,
    headers: Record<string, string>
  ): CanonicalEvent
}
