import { describe, expect, it } from 'vitest'
import { defineAbilitiesFor } from './abilities.js'

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
})
