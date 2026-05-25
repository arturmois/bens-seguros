import { describe, expect, it } from 'vitest'
import { defineAbilitiesFor } from './abilities.js'
import type { Entitlements } from './entitlements.js'

function entitlementsWith(overrides: Partial<Entitlements> = {}): Entitlements {
  return {
    maxUsers: null,
    maxProposalsPerMonth: null,
    maxChannels: null,
    maxConversationsPerOrg: null,
    maxImportRows: null,
    maxLogoSizeBytes: null,
    aiEnabled: true,
    aiMessagesIncluded: 1000,
    aiOverageCentsPerMessage: 0,
    customBranding: true,
    apiAccess: true,
    advancedReports: true,
    prioritySupport: true,
    isActive: true,
    isTrialing: false,
    trialEndsAt: null,
    billingManagedExternally: false,
    ...overrides,
  }
}

describe('CASL Abilities', () => {
  it('OWNER can manage all', () => {
    const ability = defineAbilitiesFor('OWNER')
    expect(ability.can('manage', 'all')).toBe(true)
  })
  it('ADMIN can manage Client but not Organization', () => {
    const ability = defineAbilitiesFor('ADMIN')
    expect(ability.can('manage', 'Client')).toBe(true)
    expect(ability.can('manage', 'Organization')).toBe(false)
  })
  it('MANAGER can manage operations but not Users', () => {
    const ability = defineAbilitiesFor('MANAGER')
    expect(ability.can('manage', 'Client')).toBe(true)
    expect(ability.can('manage', 'Proposal')).toBe(true)
    expect(ability.can('manage', 'User')).toBe(false)
  })
  it('ADMIN and MANAGER can manage insurers while COMMERCIAL and VIEWER cannot', () => {
    expect(defineAbilitiesFor('ADMIN').can('manage', 'Insurer')).toBe(true)
    expect(defineAbilitiesFor('MANAGER').can('manage', 'Insurer')).toBe(true)
    expect(defineAbilitiesFor('COMMERCIAL').can('manage', 'Insurer')).toBe(
      false
    )
    expect(defineAbilitiesFor('VIEWER').can('read', 'Insurer')).toBe(false)
    expect(defineAbilitiesFor('VIEWER').can('manage', 'Insurer')).toBe(false)
  })
  it('COMMERCIAL can create/read/update clients but not delete', () => {
    const ability = defineAbilitiesFor('COMMERCIAL')
    expect(ability.can('create', 'Client')).toBe(true)
    expect(ability.can('read', 'Client')).toBe(true)
    expect(ability.can('update', 'Client')).toBe(true)
    expect(ability.can('delete', 'Client')).toBe(false)
  })
  it('VIEWER can only read', () => {
    const ability = defineAbilitiesFor('VIEWER')
    expect(ability.can('read', 'Client')).toBe(true)
    expect(ability.can('read', 'Proposal')).toBe(true)
    expect(ability.can('create', 'Client')).toBe(false)
    expect(ability.can('update', 'Client')).toBe(false)
    expect(ability.can('delete', 'Client')).toBe(false)
  })
  it('only OWNER and ADMIN can lgpd-delete Client', () => {
    expect(defineAbilitiesFor('OWNER').can('lgpd-delete', 'Client')).toBe(true)
    expect(defineAbilitiesFor('ADMIN').can('lgpd-delete', 'Client')).toBe(true)
    expect(defineAbilitiesFor('MANAGER').can('lgpd-delete', 'Client')).toBe(
      false
    )
    expect(defineAbilitiesFor('COMMERCIAL').can('lgpd-delete', 'Client')).toBe(
      false
    )
    expect(defineAbilitiesFor('VIEWER').can('lgpd-delete', 'Client')).toBe(
      false
    )
  })
  it('MANAGER retains other Client permissions despite lgpd-delete denial', () => {
    const ability = defineAbilitiesFor('MANAGER')
    expect(ability.can('create', 'Client')).toBe(true)
    expect(ability.can('read', 'Client')).toBe(true)
    expect(ability.can('update', 'Client')).toBe(true)
    expect(ability.can('delete', 'Client')).toBe(true)
    expect(ability.can('lgpd-delete', 'Client')).toBe(false)
  })
  it('all roles can read Goal', () => {
    expect(defineAbilitiesFor('OWNER').can('read', 'Goal')).toBe(true)
    expect(defineAbilitiesFor('ADMIN').can('read', 'Goal')).toBe(true)
    expect(defineAbilitiesFor('MANAGER').can('read', 'Goal')).toBe(true)
    expect(defineAbilitiesFor('COMMERCIAL').can('read', 'Goal')).toBe(true)
    expect(defineAbilitiesFor('VIEWER').can('read', 'Goal')).toBe(true)
  })
  it('only OWNER/ADMIN/MANAGER can update Goal', () => {
    expect(defineAbilitiesFor('OWNER').can('update', 'Goal')).toBe(true)
    expect(defineAbilitiesFor('ADMIN').can('update', 'Goal')).toBe(true)
    expect(defineAbilitiesFor('MANAGER').can('update', 'Goal')).toBe(true)
    expect(defineAbilitiesFor('COMMERCIAL').can('update', 'Goal')).toBe(false)
    expect(defineAbilitiesFor('VIEWER').can('update', 'Goal')).toBe(false)
  })
})

describe('CASL Abilities — Entitlements feature gating', () => {
  describe('back-compat: no entitlements passed', () => {
    it('OWNER keeps manage all (no gating applied)', () => {
      const ability = defineAbilitiesFor('OWNER')
      expect(ability.can('manage', 'ApiKey')).toBe(true)
      expect(ability.can('manage', 'AiAgent')).toBe(true)
      expect(ability.can('read', 'AdvancedReport')).toBe(true)
    })
  })

  describe('apiAccess gating', () => {
    it('blocks ApiKey management when apiAccess=false even for OWNER', () => {
      const ability = defineAbilitiesFor(
        'OWNER',
        entitlementsWith({ apiAccess: false })
      )
      expect(ability.can('manage', 'ApiKey')).toBe(false)
      expect(ability.can('create', 'ApiKey')).toBe(false)
    })

    it('allows ApiKey management when apiAccess=true', () => {
      const ability = defineAbilitiesFor(
        'OWNER',
        entitlementsWith({ apiAccess: true })
      )
      expect(ability.can('manage', 'ApiKey')).toBe(true)
    })
  })

  describe('aiEnabled gating', () => {
    it('blocks AiAgent management when aiEnabled=false', () => {
      const ability = defineAbilitiesFor(
        'OWNER',
        entitlementsWith({ aiEnabled: false })
      )
      expect(ability.can('manage', 'AiAgent')).toBe(false)
      expect(ability.can('create', 'AiAgent')).toBe(false)
    })

    it('allows AiAgent management when aiEnabled=true (OWNER manage all)', () => {
      const ability = defineAbilitiesFor(
        'OWNER',
        entitlementsWith({ aiEnabled: true })
      )
      expect(ability.can('manage', 'AiAgent')).toBe(true)
    })
  })

  describe('advancedReports gating', () => {
    it('blocks reading AdvancedReport when advancedReports=false', () => {
      const ability = defineAbilitiesFor(
        'OWNER',
        entitlementsWith({ advancedReports: false })
      )
      expect(ability.can('read', 'AdvancedReport')).toBe(false)
    })

    it('allows reading AdvancedReport when advancedReports=true', () => {
      const ability = defineAbilitiesFor(
        'OWNER',
        entitlementsWith({ advancedReports: true })
      )
      expect(ability.can('read', 'AdvancedReport')).toBe(true)
    })
  })

  describe('prioritySupport gating', () => {
    it('blocks PrioritySupportTicket when prioritySupport=false', () => {
      const ability = defineAbilitiesFor(
        'OWNER',
        entitlementsWith({ prioritySupport: false })
      )
      expect(ability.can('manage', 'PrioritySupportTicket')).toBe(false)
    })
  })

  describe('customBranding gating', () => {
    it('blocks updating Organization when customBranding=false', () => {
      const ability = defineAbilitiesFor(
        'OWNER',
        entitlementsWith({ customBranding: false })
      )
      expect(ability.can('update', 'Organization')).toBe(false)
    })

    it('allows updating Organization when customBranding=true', () => {
      const ability = defineAbilitiesFor(
        'OWNER',
        entitlementsWith({ customBranding: true })
      )
      expect(ability.can('update', 'Organization')).toBe(true)
    })
  })

  describe('cascade: entitlements gate beats role permissiveness', () => {
    it('OWNER with empty entitlements gets all features blocked', () => {
      const ability = defineAbilitiesFor(
        'OWNER',
        entitlementsWith({
          apiAccess: false,
          aiEnabled: false,
          advancedReports: false,
          prioritySupport: false,
          customBranding: false,
        })
      )
      expect(ability.can('manage', 'ApiKey')).toBe(false)
      expect(ability.can('manage', 'AiAgent')).toBe(false)
      expect(ability.can('read', 'AdvancedReport')).toBe(false)
      expect(ability.can('manage', 'PrioritySupportTicket')).toBe(false)
      expect(ability.can('update', 'Organization')).toBe(false)
      // Other operational subjects still permitted via manage all
      expect(ability.can('manage', 'Client')).toBe(true)
    })
  })
})
