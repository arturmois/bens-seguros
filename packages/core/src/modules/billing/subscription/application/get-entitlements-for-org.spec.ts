import { DEFAULT_PERMISSIVE_ENTITLEMENTS } from '@repo/auth/entitlements'
import { describe, expect, it, vi } from 'vitest'
import type { SubscriptionRepository } from '../domain/subscription-repository.js'
import { GetEntitlementsForOrg } from './get-entitlements-for-org.js'

function makeRepo(row: unknown): SubscriptionRepository {
  return {
    findWithPlanByOrganizationId: vi.fn().mockResolvedValue(row),
    findByProviderCustomerId: vi.fn(),
    updateStatus: vi.fn(),
    upsertInvoice: vi.fn(),
    findPlanBySlug: vi.fn(),
    createSubscription: vi.fn(),
  } as unknown as SubscriptionRepository
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

describe('GetEntitlementsForOrg', () => {
  it('returns DEFAULT_PERMISSIVE_ENTITLEMENTS when no subscription exists', async () => {
    const repo = makeRepo(null)
    const useCase = new GetEntitlementsForOrg(repo)
    const result = await useCase.execute('org-1')
    expect(result).toEqual(DEFAULT_PERMISSIVE_ENTITLEMENTS)
  })

  it('queries by organizationId', async () => {
    const repo = makeRepo(sampleRow)
    const useCase = new GetEntitlementsForOrg(repo)
    await useCase.execute('org-1')
    expect(repo.findWithPlanByOrganizationId).toHaveBeenCalledWith('org-1')
  })

  it('projects plan + subscription into Entitlements when ACTIVE', async () => {
    const repo = makeRepo(sampleRow)
    const useCase = new GetEntitlementsForOrg(repo)
    const result = await useCase.execute('org-1')
    expect(result.maxChannels).toBe(3)
    expect(result.maxUsers).toBe(5)
    expect(result.aiEnabled).toBe(true)
    expect(result.isActive).toBe(true)
    expect(result.billingManagedExternally).toBe(false)
  })

  it('isTrialing true and isActive true when status is TRIALING', async () => {
    const repo = makeRepo({ ...sampleRow, status: 'TRIALING' })
    const useCase = new GetEntitlementsForOrg(repo)
    const result = await useCase.execute('org-1')
    expect(result.isActive).toBe(true)
    expect(result.isTrialing).toBe(true)
  })

  it('isActive false when status is EXPIRED', async () => {
    const repo = makeRepo({ ...sampleRow, status: 'EXPIRED' })
    const useCase = new GetEntitlementsForOrg(repo)
    const result = await useCase.execute('org-1')
    expect(result.isActive).toBe(false)
  })

  it('isActive false when status is PAST_DUE', async () => {
    const repo = makeRepo({ ...sampleRow, status: 'PAST_DUE' })
    const useCase = new GetEntitlementsForOrg(repo)
    const result = await useCase.execute('org-1')
    expect(result.isActive).toBe(false)
  })

  it('isActive false when status is CANCELED', async () => {
    const repo = makeRepo({ ...sampleRow, status: 'CANCELED' })
    const useCase = new GetEntitlementsForOrg(repo)
    const result = await useCase.execute('org-1')
    expect(result.isActive).toBe(false)
  })

  it('applies customQuotas override when present', async () => {
    const repo = makeRepo({ ...sampleRow, customQuotas: { maxChannels: 99 } })
    const useCase = new GetEntitlementsForOrg(repo)
    const result = await useCase.execute('org-1')
    expect(result.maxChannels).toBe(99)
  })

  it('treats non-record customQuotas as null', async () => {
    const repo = makeRepo({ ...sampleRow, customQuotas: ['ignored'] })
    const useCase = new GetEntitlementsForOrg(repo)
    const result = await useCase.execute('org-1')
    expect(result.maxChannels).toBe(3)
  })

  it('billingManagedExternally true exposes flag to caller', async () => {
    const repo = makeRepo({
      ...sampleRow,
      status: 'BILLED_EXTERNALLY',
      billingManagedExternally: true,
    })
    const useCase = new GetEntitlementsForOrg(repo)
    const result = await useCase.execute('org-1')
    expect(result.billingManagedExternally).toBe(true)
    expect(result.isActive).toBe(true)
  })
})
