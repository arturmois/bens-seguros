import { Check, Shield } from 'lucide-react'

import type { FilterDefinition } from '@/components/shared/filter-types'

import type { MemberData } from '../types'

const STATUS_OPTIONS = [
  { value: 'true', label: 'Ativo' },
  { value: 'false', label: 'Inativo' },
] as const

const ROLE_OPTIONS = [
  { value: 'OWNER', label: 'Proprietário' },
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'MANAGER', label: 'Gerente' },
  { value: 'COMMERCIAL', label: 'Comercial' },
  { value: 'VIEWER', label: 'Visualizador' },
] as const

export const MEMBER_FILTERS: readonly FilterDefinition[] = [
  {
    key: 'active',
    label: 'Status',
    icon: Check,
    type: 'enum',
    options: STATUS_OPTIONS,
  },
  {
    key: 'roleIn',
    label: 'Cargo',
    icon: Shield,
    type: 'enum',
    options: ROLE_OPTIONS,
  },
] as const

export function matchesActive(
  member: MemberData,
  active: boolean | undefined
): boolean {
  if (active === undefined) return true
  return member.active === active
}

export function matchesRole(
  member: MemberData,
  roleIn: readonly string[] | undefined
): boolean {
  if (!roleIn || roleIn.length === 0) return true
  return roleIn.includes(member.role)
}

export function matchesSearch(member: MemberData, search: string): boolean {
  if (!search) return true
  const needle = search.toLowerCase()
  return (
    (member.name ?? '').toLowerCase().includes(needle) ||
    member.email.toLowerCase().includes(needle)
  )
}
