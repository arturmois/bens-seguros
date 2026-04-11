import type { MemberData } from '../types'

export function matchesRole(member: MemberData, filter: string): boolean {
  if (filter === 'ALL') return true
  return member.role === filter
}

export function matchesActive(member: MemberData, filter: string): boolean {
  if (filter === 'ALL') return true
  return filter === 'ACTIVE' ? member.active : !member.active
}

export function matchesSearch(member: MemberData, search: string): boolean {
  if (!search) return true
  const needle = search.toLowerCase()
  return (
    (member.name ?? '').toLowerCase().includes(needle) ||
    member.email.toLowerCase().includes(needle)
  )
}
