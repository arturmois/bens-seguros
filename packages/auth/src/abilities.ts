import {
  AbilityBuilder,
  createMongoAbility,
  type MongoAbility,
} from '@casl/ability'
import type { Entitlements } from './entitlements.js'
import type { Role } from './roles.js'

export type Action =
  | 'manage'
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'approve'
  | 'lgpd-delete'
export type Subject =
  | 'all'
  | 'User'
  | 'Organization'
  | 'Contact'
  | 'Client'
  | 'Proposal'
  | 'Policy'
  | 'Claim'
  | 'Commission'
  | 'Endorsement'
  | 'Assistance'
  | 'Document'
  | 'AuditLog'
  | 'Notification'
  | 'Member'
  | 'Invitation'
  | 'Insurer'
  | 'Goal'
  | 'ApiKey'
  | 'AiAgent'
  | 'AdvancedReport'
  | 'PrioritySupportTicket'

export type AppAbility = MongoAbility<[Action, Subject]>

const OPERATIONAL_SUBJECTS: Subject[] = [
  'Contact',
  'Client',
  'Proposal',
  'Policy',
  'Claim',
  'Endorsement',
  'Assistance',
  'Document',
  'Insurer',
]

// Apply role-only rules first. Entitlements layer below trims off features the
// org's plan doesn't include — `cannot` overrides `can` regardless of how
// permissive the role is (including OWNER + manage all).
export function defineAbilitiesFor(
  role: Role,
  entitlements?: Entitlements
): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(
    createMongoAbility
  )
  switch (role) {
    case 'OWNER':
      can('manage', 'all')
      break
    case 'ADMIN':
      can('manage', OPERATIONAL_SUBJECTS)
      can('manage', 'Commission')
      can('approve', 'Commission')
      can('manage', 'User')
      can('manage', 'Notification')
      can('read', 'AuditLog')
      can('read', 'Organization')
      can('lgpd-delete', 'Client')
      can(['read', 'update', 'delete'], 'Member')
      can(['create', 'read', 'delete'], 'Invitation')
      can(['read', 'update'], 'Goal')
      break
    case 'MANAGER':
      can('manage', OPERATIONAL_SUBJECTS)
      cannot('lgpd-delete', 'Client')
      can('manage', 'Commission')
      can('approve', 'Commission')
      can('read', 'Notification')
      can('read', 'AuditLog')
      can('read', 'Member')
      can('read', 'Invitation')
      can(['read', 'update'], 'Goal')
      break
    case 'COMMERCIAL':
      can(['create', 'read', 'update'], ['Contact', 'Client', 'Proposal'])
      can('read', ['Policy', 'Claim'])
      can(['read', 'approve'], 'Commission')
      can(['read', 'create'], 'Document')
      can('read', 'Notification')
      can('read', 'Member')
      can('read', 'Goal')
      break
    case 'VIEWER':
      can('read', OPERATIONAL_SUBJECTS)
      cannot('read', 'Insurer')
      can('read', ['Commission', 'Notification'])
      can('read', 'Goal')
      break
  }

  // Plan-level feature gating. Applied after role rules so `cannot` wins over
  // a role's `manage all`. When entitlements is undefined (caller hasn't wired
  // subscription middleware yet, e.g. transitional code paths), every feature
  // gate stays open — back-compat.
  if (entitlements) {
    if (!entitlements.apiAccess) {
      cannot('manage', 'ApiKey')
    }
    if (!entitlements.aiEnabled) {
      cannot('manage', 'AiAgent')
    }
    if (!entitlements.advancedReports) {
      cannot('read', 'AdvancedReport')
    }
    if (!entitlements.prioritySupport) {
      cannot('manage', 'PrioritySupportTicket')
    }
    if (!entitlements.customBranding) {
      // Plan without customBranding can still read/update general org settings
      // but cannot mutate the logo. Logo write is the only branding-gated
      // operation on Organization for now; future fields (custom domain,
      // theme) can join here.
      cannot('update', 'Organization')
    }
  }

  return build()
}
