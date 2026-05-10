import { defineAbilitiesFor } from '@repo/auth/abilities'
import type { Action, Subject } from '@repo/auth/abilities'
import type { Role } from '@repo/auth/roles'

const SUBJECT_MAP: Record<string, Subject> = {
  clients: 'Client',
  proposals: 'Proposal',
  policies: 'Policy',
  insurers: 'Insurer',
  commissions: 'Commission',
  claims: 'Claim',
  endorsements: 'Endorsement',
  assistances: 'Assistance',
  documents: 'Document',
  users: 'Member',
  settings: 'Organization',
  audit: 'AuditLog',
}

const ACTION_MAP: Record<string, Action> = {
  read: 'read',
  create: 'create',
  update: 'update',
  delete: 'delete',
  manage: 'manage',
  approve: 'approve',
  'lgpd-delete': 'lgpd-delete',
}

export function hasPermission(role: Role, permission: string): boolean {
  const parts = permission.split(':')
  const resource = parts[0]
  const action = parts[1]
  if (!resource || !action) return false
  const subject = SUBJECT_MAP[resource]
  const caslAction = ACTION_MAP[action]
  if (!subject || !caslAction) return false
  const ability = defineAbilitiesFor(role)
  return ability.can(caslAction, subject)
}

export function hasAnyPermission(role: Role, permissions: string[]): boolean {
  return permissions.some((p) => hasPermission(role, p))
}

export function hasAllPermissions(role: Role, permissions: string[]): boolean {
  return permissions.every((p) => hasPermission(role, p))
}
