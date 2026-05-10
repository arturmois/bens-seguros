import { describe, expect, it } from 'vitest'
import {
  MEMBER_ROLES,
  MEMBER_ROLE_HIERARCHY,
  isMemberRole,
} from './member-roles.js'

describe('MEMBER_ROLE_HIERARCHY', () => {
  it('has an entry for every MEMBER_ROLES value', () => {
    const roles = Object.values(MEMBER_ROLES)
    const hierarchyKeys = Object.keys(MEMBER_ROLE_HIERARCHY)
    expect(hierarchyKeys.sort()).toEqual([...roles].sort())
  })
  it('assigns a unique numeric level to each role', () => {
    const levels = Object.values(MEMBER_ROLE_HIERARCHY)
    const unique = new Set(levels)
    expect(unique.size).toBe(levels.length)
  })
  it('orders roles from OWNER (highest) to VIEWER (lowest)', () => {
    expect(MEMBER_ROLE_HIERARCHY.OWNER).toBeGreaterThan(
      MEMBER_ROLE_HIERARCHY.ADMIN
    )
    expect(MEMBER_ROLE_HIERARCHY.ADMIN).toBeGreaterThan(
      MEMBER_ROLE_HIERARCHY.MANAGER
    )
    expect(MEMBER_ROLE_HIERARCHY.MANAGER).toBeGreaterThan(
      MEMBER_ROLE_HIERARCHY.COMMERCIAL
    )
    expect(MEMBER_ROLE_HIERARCHY.COMMERCIAL).toBeGreaterThan(
      MEMBER_ROLE_HIERARCHY.VIEWER
    )
  })
})

describe('isMemberRole', () => {
  it('returns true for valid roles', () => {
    expect(isMemberRole('OWNER')).toBe(true)
    expect(isMemberRole('VIEWER')).toBe(true)
  })
  it('returns false for unknown roles', () => {
    expect(isMemberRole('ROOT')).toBe(false)
    expect(isMemberRole('owner')).toBe(false)
    expect(isMemberRole('')).toBe(false)
  })
})
