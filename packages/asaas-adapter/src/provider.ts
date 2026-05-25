import {
  BillingProviderError,
  type BillingProvider,
  type CanonicalEvent,
  type CreateCustomerInput,
  type CreateSubscriptionInput,
  type CustomerRef,
  type PaymentMethodRef,
  type PlanRef,
  type SubscriptionRef,
  type TokenizeInput,
} from '@repo/billing-port'
import { AsaasClient } from './client'
import { createCustomer } from './customers'
import {
  cancelSubscription,
  changeSubscriptionPlan,
  createSubscription,
} from './subscriptions'
import { validateAndParseWebhook } from './webhooks'

type AsaasBillingProviderOptions = {
  env: 'sandbox' | 'production'
  apiKey: string
  webhookSecretCurrent: string
  webhookSecretPrevious?: string
  fetch?: typeof fetch
}

export class AsaasBillingProvider implements BillingProvider {
  private readonly client: AsaasClient
  private readonly webhookSecretCurrent: string
  private readonly webhookSecretPrevious?: string

  constructor(opts: AsaasBillingProviderOptions) {
    this.client = new AsaasClient({
      env: opts.env,
      apiKey: opts.apiKey,
      fetch: opts.fetch,
    })
    this.webhookSecretCurrent = opts.webhookSecretCurrent
    this.webhookSecretPrevious = opts.webhookSecretPrevious
  }

  createCustomer(input: CreateCustomerInput): Promise<CustomerRef> {
    return createCustomer(this.client, input)
  }

  createSubscription(input: CreateSubscriptionInput): Promise<SubscriptionRef> {
    return createSubscription(this.client, input)
  }

  cancelSubscription(ref: SubscriptionRef): Promise<void> {
    return cancelSubscription(this.client, ref)
  }

  changeSubscriptionPlan(
    ref: SubscriptionRef,
    newPlan: PlanRef
  ): Promise<SubscriptionRef> {
    return changeSubscriptionPlan(this.client, ref, newPlan)
  }

  tokenizeCard(_input: TokenizeInput): Promise<PaymentMethodRef> {
    return Promise.reject(
      new BillingProviderError(
        'asaas',
        'tokenizeCard not supported in MVP — use hosted checkout flow (Fase 4F)'
      )
    )
  }

  validateAndParseWebhook(
    body: string,
    headers: Record<string, string>
  ): CanonicalEvent {
    return validateAndParseWebhook(body, headers, {
      currentSecret: this.webhookSecretCurrent,
      previousSecret: this.webhookSecretPrevious,
    })
  }
}
