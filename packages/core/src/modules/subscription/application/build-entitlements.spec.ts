import { describe, expect, it } from 'vitest'
import { DEFAULT_PERMISSIVE_ENTITLEMENTS } from '@repo/auth/entitlements'
import {
  buildEntitlements,
  type PlanShape,
  type SubscriptionShape,
} from './build-entitlements.js'

const businessPlan: PlanShape = {
  maxUsers: null,
  maxProposalsPerMonth: null,
  maxChannels: null,
  maxConversationsPerOrg: null,
  maxImportRows: null,
  maxLogoSizeBytes: 5 * 1024 * 1024,
  aiEnabled: true,
  aiMessagesIncluded: 5000,
  aiOverageCentsPerMessage: 15,
  features: {
    customBranding: true,
    advancedReports: true,
    apiAccess: true,
    prioritySupport: true,
  },
}

const starterPlan: PlanShape = {
  maxUsers: 3,
  maxProposalsPerMonth: 100,
  maxChannels: 3,
  maxConversationsPerOrg: 100,
  maxImportRows: 500,
  maxLogoSizeBytes: 512 * 1024,
  aiEnabled: true,
  aiMessagesIncluded: 200,
  aiOverageCentsPerMessage: 30,
  features: {
    customBranding: false,
    advancedReports: false,
  },
}

const activeSubscription: SubscriptionShape = {
  status: 'ACTIVE',
  trialEndsAt: null,
  billingManagedExternally: false,
  customQuotas: null,
}

describe('buildEntitlements', () => {
  describe('null inputs', () => {
    it('returns permissive defaults when subscription is null', () => {
      expect(buildEntitlements(null, businessPlan)).toEqual(
        DEFAULT_PERMISSIVE_ENTITLEMENTS
      )
    })

    it('returns permissive defaults when plan is null', () => {
      expect(buildEntitlements(activeSubscription, null)).toEqual(
        DEFAULT_PERMISSIVE_ENTITLEMENTS
      )
    })

    it('returns permissive defaults when both are null', () => {
      expect(buildEntitlements(null, null)).toEqual(
        DEFAULT_PERMISSIVE_ENTITLEMENTS
      )
    })
  })

  describe('plan projection (no custom overrides)', () => {
    it('projects business plan with unlimited quotas', () => {
      const result = buildEntitlements(activeSubscription, businessPlan)
      expect(result.maxUsers).toBeNull()
      expect(result.maxProposalsPerMonth).toBeNull()
      expect(result.aiMessagesIncluded).toBe(5000)
      expect(result.customBranding).toBe(true)
      expect(result.apiAccess).toBe(true)
    })

    it('projects starter plan with bounded quotas', () => {
      const result = buildEntitlements(activeSubscription, starterPlan)
      expect(result.maxUsers).toBe(3)
      expect(result.maxProposalsPerMonth).toBe(100)
      expect(result.customBranding).toBe(false)
      expect(result.apiAccess).toBe(false)
    })

    it('reads features defaulting to false when absent from plan JSON', () => {
      const minimalPlan: PlanShape = {
        ...starterPlan,
        features: {},
      }
      const result = buildEntitlements(activeSubscription, minimalPlan)
      expect(result.customBranding).toBe(false)
      expect(result.apiAccess).toBe(false)
      expect(result.advancedReports).toBe(false)
      expect(result.prioritySupport).toBe(false)
    })
  })

  describe('customQuotas overrides', () => {
    it('applies numeric quota override over plan value', () => {
      const subscription: SubscriptionShape = {
        ...activeSubscription,
        customQuotas: { maxUsers: 50 },
      }
      const result = buildEntitlements(subscription, starterPlan)
      expect(result.maxUsers).toBe(50)
      expect(result.maxProposalsPerMonth).toBe(100)
    })

    it('applies null override (unlimited) over a bounded plan value', () => {
      const subscription: SubscriptionShape = {
        ...activeSubscription,
        customQuotas: { maxProposalsPerMonth: null },
      }
      const result = buildEntitlements(subscription, starterPlan)
      expect(result.maxProposalsPerMonth).toBeNull()
    })

    it('ignores undefined override (falls back to plan)', () => {
      const subscription: SubscriptionShape = {
        ...activeSubscription,
        customQuotas: {},
      }
      const result = buildEntitlements(subscription, starterPlan)
      expect(result.maxUsers).toBe(3)
    })

    it('ignores non-numeric override values defensively', () => {
      const subscription: SubscriptionShape = {
        ...activeSubscription,
        customQuotas: { maxUsers: 'banana' },
      }
      const result = buildEntitlements(subscription, starterPlan)
      expect(result.maxUsers).toBe(3)
    })

    it('ignores unknown keys outside QUOTA_OVERRIDE_KEYS', () => {
      const subscription: SubscriptionShape = {
        ...activeSubscription,
        customQuotas: { maxUsers: 10, randomKey: 9999 },
      }
      const result = buildEntitlements(subscription, starterPlan)
      expect(result.maxUsers).toBe(10)
      expect(result).not.toHaveProperty('randomKey')
    })

    it('applies feature override via features nested object', () => {
      const subscription: SubscriptionShape = {
        ...activeSubscription,
        customQuotas: { features: { customBranding: true } },
      }
      const result = buildEntitlements(subscription, starterPlan)
      expect(result.customBranding).toBe(true)
      expect(result.advancedReports).toBe(false)
    })

    it('can downgrade aiEnabled via features override even on AI-enabled plan', () => {
      const subscription: SubscriptionShape = {
        ...activeSubscription,
        customQuotas: { features: { aiEnabled: false } },
      }
      const result = buildEntitlements(subscription, starterPlan)
      expect(result.aiEnabled).toBe(false)
      expect(starterPlan.aiEnabled).toBe(true)
    })

    it('ignores non-boolean feature override defensively', () => {
      const subscription: SubscriptionShape = {
        ...activeSubscription,
        customQuotas: { features: { customBranding: 'sim' } },
      }
      const result = buildEntitlements(subscription, starterPlan)
      expect(result.customBranding).toBe(false)
    })
  })

  describe('lifecycle flags from subscription status', () => {
    it('isActive=true for ACTIVE', () => {
      expect(
        buildEntitlements(
          { ...activeSubscription, status: 'ACTIVE' },
          starterPlan
        ).isActive
      ).toBe(true)
    })

    it('isActive=true for TRIALING + isTrialing=true', () => {
      const result = buildEntitlements(
        { ...activeSubscription, status: 'TRIALING' },
        starterPlan
      )
      expect(result.isActive).toBe(true)
      expect(result.isTrialing).toBe(true)
    })

    it('isActive=true for BILLED_EXTERNALLY', () => {
      const result = buildEntitlements(
        {
          ...activeSubscription,
          status: 'BILLED_EXTERNALLY',
          billingManagedExternally: true,
        },
        starterPlan
      )
      expect(result.isActive).toBe(true)
      expect(result.billingManagedExternally).toBe(true)
    })

    it('isActive=false for PAST_DUE', () => {
      expect(
        buildEntitlements(
          { ...activeSubscription, status: 'PAST_DUE' },
          starterPlan
        ).isActive
      ).toBe(false)
    })

    it('isActive=false for CANCELED', () => {
      expect(
        buildEntitlements(
          { ...activeSubscription, status: 'CANCELED' },
          starterPlan
        ).isActive
      ).toBe(false)
    })

    it('isActive=false for EXPIRED', () => {
      expect(
        buildEntitlements(
          { ...activeSubscription, status: 'EXPIRED' },
          starterPlan
        ).isActive
      ).toBe(false)
    })

    it('propagates trialEndsAt verbatim', () => {
      const trialEnd = new Date('2026-06-15T12:00:00Z')
      const result = buildEntitlements(
        {
          ...activeSubscription,
          status: 'TRIALING',
          trialEndsAt: trialEnd,
        },
        starterPlan
      )
      expect(result.trialEndsAt).toEqual(trialEnd)
    })
  })

  describe('BILLED_EXTERNALLY does NOT magically unlock quotas', () => {
    it('keeps starter plan quotas even when billingManagedExternally', () => {
      const result = buildEntitlements(
        {
          ...activeSubscription,
          status: 'BILLED_EXTERNALLY',
          billingManagedExternally: true,
        },
        starterPlan
      )
      expect(result.maxUsers).toBe(3)
      expect(result.aiMessagesIncluded).toBe(200)
    })

    it('only customQuotas elevates BILLED_EXTERNALLY orgs above plan', () => {
      const result = buildEntitlements(
        {
          ...activeSubscription,
          status: 'BILLED_EXTERNALLY',
          billingManagedExternally: true,
          customQuotas: { maxUsers: null },
        },
        starterPlan
      )
      expect(result.maxUsers).toBeNull()
    })
  })
})
