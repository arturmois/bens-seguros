import {
  AbilityBuilder,
  createMongoAbility,
  type MongoAbility,
} from '@casl/ability'
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

export function defineAbilitiesFor(role: Role): AppAbility {
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
  return build()
}
