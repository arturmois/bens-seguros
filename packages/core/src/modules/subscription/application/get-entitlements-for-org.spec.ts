import { DEFAULT_PERMISSIVE_ENTITLEMENTS } from '@repo/auth/entitlements'
import { describe, expect, it, vi } from 'vitest'

import {
  getEntitlementsForOrg,
  type SubscriptionLookupClient,
} from './get-entitlements-for-org.js'

function makeClient(row: unknown): SubscriptionLookupClient & {
  subscription: { findUnique: ReturnType<typeof vi.fn> }
} {
  const findUnique = vi.fn().mockResolvedValue(row)
  return {
    subscription: { findUnique },
  } as unknown as SubscriptionLookupClient & {
    subscription: { findUnique: ReturnType<typeof vi.fn> }
  }
}

const sampleRow = {
  status: 'ACTIVE' as const,
  trialEndsAt: null,
  billingManagedExternally: false,
  customQuotas: null,
  plan: {
    maxUsers: 5,
    maxProposalsPerMonth: 50,
    maxChannels: 3,
    maxConversationsPerOrg: 100,
    maxImportRows: 500,
    maxLogoSizeBytes: 1024 * 1024,
    aiEnabled: true,
    aiMessagesIncluded: 1000,
    aiOverageCentsPerMessage: 10,
    features: {
      customBranding: false,
      apiAccess: false,
      advancedReports: false,
      prioritySupport: false,
    },
  },
}

describe('getEntitlementsForOrg', () => {
  it('returns DEFAULT_PERMISSIVE_ENTITLEMENTS when no subscription exists', async () => {
    const client = makeClient(null)
    const result = await getEntitlementsForOrg(client, 'org-1')
    expect(result).toEqual(DEFAULT_PERMISSIVE_ENTITLEMENTS)
  })

  it('queries by organizationId and includes plan', async () => {
    const client = makeClient(sampleRow)
    await getEntitlementsForOrg(client, 'org-1')
    expect(client.subscription.findUnique).toHaveBeenCalledWith({
      where: { organizationId: 'org-1' },
      include: { plan: true },
    })
  })

  it('projects plan + subscription into Entitlements when ACTIVE', async () => {
    const client = makeClient(sampleRow)
    const result = await getEntitlementsForOrg(client, 'org-1')
    expect(result.maxChannels).toBe(3)
    expect(result.maxUsers).toBe(5)
    expect(result.aiEnabled).toBe(true)
    expect(result.isActive).toBe(true)
    expect(result.billingManagedExternally).toBe(false)
  })

  it('isTrialing true and isActive true when status is TRIALING', async () => {
    const client = makeClient({ ...sampleRow, status: 'TRIALING' })
    const result = await getEntitlementsForOrg(client, 'org-1')
    expect(result.isActive).toBe(true)
    expect(result.isTrialing).toBe(true)
  })

  it('isActive false when status is EXPIRED', async () => {
    const client = makeClient({ ...sampleRow, status: 'EXPIRED' })
    const result = await getEntitlementsForOrg(client, 'org-1')
    expect(result.isActive).toBe(false)
  })

  it('isActive false when status is PAST_DUE', async () => {
    const client = makeClient({ ...sampleRow, status: 'PAST_DUE' })
    const result = await getEntitlementsForOrg(client, 'org-1')
    expect(result.isActive).toBe(false)
  })

  it('isActive false when status is CANCELED', async () => {
    const client = makeClient({ ...sampleRow, status: 'CANCELED' })
    const result = await getEntitlementsForOrg(client, 'org-1')
    expect(result.isActive).toBe(false)
  })

  it('applies customQuotas override when present', async () => {
    const client = makeClient({
      ...sampleRow,
      customQuotas: { maxChannels: 99 },
    })
    const result = await getEntitlementsForOrg(client, 'org-1')
    expect(result.maxChannels).toBe(99)
  })

  it('treats non-record customQuotas as null', async () => {
    const client = makeClient({ ...sampleRow, customQuotas: ['ignored'] })
    const result = await getEntitlementsForOrg(client, 'org-1')
    expect(result.maxChannels).toBe(3)
  })

  it('billingManagedExternally true exposes flag to caller', async () => {
    const client = makeClient({
      ...sampleRow,
      status: 'BILLED_EXTERNALLY',
      billingManagedExternally: true,
    })
    const result = await getEntitlementsForOrg(client, 'org-1')
    expect(result.billingManagedExternally).toBe(true)
    expect(result.isActive).toBe(true)
  })
})
