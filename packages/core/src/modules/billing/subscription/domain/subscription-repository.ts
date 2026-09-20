export type SubscriptionStatusValue =
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELED'
  | 'EXPIRED'
  | 'BILLED_EXTERNALLY'

// Returned by GetEntitlementsForOrg — mirrors the findUnique query with plan include
export interface SubscriptionWithPlan {
  readonly status: SubscriptionStatusValue
  readonly trialEndsAt: Date | null
  readonly billingManagedExternally: boolean
  readonly customQuotas: unknown
  readonly plan: {
    readonly maxUsers: number | null
    readonly maxProposalsPerMonth: number | null
    readonly maxChannels: number | null
    readonly maxConversationsPerOrg: number | null
    readonly maxImportRows: number | null
    readonly maxLogoSizeBytes: number | null
    readonly aiEnabled: boolean
    readonly aiMessagesIncluded: number
    readonly aiOverageCentsPerMessage: number
    readonly features: unknown
  }
}

// Returned by ProcessBillingWebhookEvent — mirrors BillingSubscriptionRow
export interface SubscriptionBillingRow {
  readonly id: string
  readonly organizationId: string
  readonly status: string
  readonly currentPeriodStart: Date
  readonly currentPeriodEnd: Date
  readonly billingManagedExternally: boolean
}

// Input for subscription creation in CreateOrgWithTrial
export interface CreateSubscriptionInput {
  organizationId: string
  planId: string
  status: 'TRIALING'
  trialEndsAt: Date
  currentPeriodStart: Date
  currentPeriodEnd: Date
}

// Returned by findPlanBySlug in CreateOrgWithTrial
export interface PlanRow {
  readonly id: string
  readonly slug: string
}

export interface SubscriptionRepository {
  // GetEntitlementsForOrg: subscription + full plan
  findWithPlanByOrganizationId(
    organizationId: string
  ): Promise<SubscriptionWithPlan | null>

  // ProcessBillingWebhookEvent: lookup by provider customer ID
  findByProviderCustomerId(
    providerCustomerId: string
  ): Promise<SubscriptionBillingRow | null>

  // ProcessBillingWebhookEvent: update status (ACTIVE / PAST_DUE / CANCELED)
  updateStatus(
    subscriptionId: string,
    status: 'ACTIVE' | 'PAST_DUE' | 'CANCELED',
    opts?: { canceledAt?: Date }
  ): Promise<void>

  // ProcessBillingWebhookEvent: create/update invoice
  upsertInvoice(input: {
    organizationId: string
    subscriptionId: string
    billingProviderPaymentId: string
    amountCents: number
    status: 'PAID' | 'OVERDUE' | 'REFUNDED'
    paidAt?: Date
    periodStart: Date
    periodEnd: Date
  }): Promise<void>

  // CreateOrgWithTrial: find plan by slug
  findPlanBySlug(slug: string): Promise<PlanRow | null>

  // CreateOrgWithTrial: create a new subscription
  createSubscription(input: CreateSubscriptionInput): Promise<{ id: string }>
}
