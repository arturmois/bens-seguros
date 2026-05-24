// Entitlements view consumed by CASL abilities and subscription-middleware.
// Auth layer is deliberately UNAWARE of Subscription/Plan models (AC4) — billing
// produces this projection, auth consumes it. Switching pricing model (tier ↔
// seat-based) only changes buildEntitlements; abilities stay stable.
export interface Entitlements {
  // Quotas — null means unlimited.
  readonly maxUsers: number | null
  readonly maxProposalsPerMonth: number | null
  readonly maxChannels: number | null
  readonly maxConversationsPerOrg: number | null
  readonly maxImportRows: number | null
  readonly maxLogoSizeBytes: number | null

  // Feature flags.
  readonly aiEnabled: boolean
  readonly aiMessagesIncluded: number
  readonly aiOverageCentsPerMessage: number
  readonly customBranding: boolean
  readonly apiAccess: boolean
  readonly advancedReports: boolean
  readonly prioritySupport: boolean

  // Lifecycle (computed from subscription status).
  readonly isActive: boolean
  readonly isTrialing: boolean
  readonly trialEndsAt: Date | null
  readonly billingManagedExternally: boolean
}

// Default entitlements for orgs WITHOUT a Subscription row (transitional state
// only — should never happen post-Fase 2D in prod). Permissive to avoid soft-
// locking legit orgs while billing onboarding catches up.
export const DEFAULT_PERMISSIVE_ENTITLEMENTS: Entitlements = {
  maxUsers: null,
  maxProposalsPerMonth: null,
  maxChannels: null,
  maxConversationsPerOrg: null,
  maxImportRows: null,
  maxLogoSizeBytes: null,
  aiEnabled: true,
  aiMessagesIncluded: 0,
  aiOverageCentsPerMessage: 0,
  customBranding: true,
  apiAccess: true,
  advancedReports: true,
  prioritySupport: false,
  isActive: true,
  isTrialing: false,
  trialEndsAt: null,
  billingManagedExternally: true,
}
