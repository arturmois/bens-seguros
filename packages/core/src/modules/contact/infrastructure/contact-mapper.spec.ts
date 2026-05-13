import { describe, expect, it } from 'vitest'
import { ContactMapper } from './contact-mapper.js'

describe('ContactMapper.deriveStage', () => {
  it('returns LEAD when contact has no clientId', () => {
    expect(ContactMapper.deriveStage(null, 0, 0)).toBe('LEAD')
    expect(ContactMapper.deriveStage(null, 0, 5)).toBe('LEAD')
  })
  it('returns CLIENT_ACTIVE when contact has at least one active policy', () => {
    expect(ContactMapper.deriveStage('client-1', 1, 1)).toBe('CLIENT_ACTIVE')
    expect(ContactMapper.deriveStage('client-1', 2, 5)).toBe('CLIENT_ACTIVE')
  })
  it('returns CLIENT_INACTIVE when promoted contact had policies but none active now', () => {
    expect(ContactMapper.deriveStage('client-1', 0, 3)).toBe('CLIENT_INACTIVE')
    expect(ContactMapper.deriveStage('client-1', 0, 1)).toBe('CLIENT_INACTIVE')
  })
  it('returns CLIENT_NEW when promoted contact has never had any policy', () => {
    expect(ContactMapper.deriveStage('client-1', 0, 0)).toBe('CLIENT_NEW')
  })
})
