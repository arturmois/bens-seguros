import { describe, it, expect } from 'vitest'
import { Contact } from './contact.js'

describe('Contact', () => {
  const baseInput = {
    organizationId: 'org-1',
    name: 'Maria',
    phone: '+5511999999999',
    salespersonId: 'user-1',
    source: 'MANUAL' as const,
    consentLgpd: true,
  }
  it('creates contact with phone only', () => {
    const c = Contact.create(baseInput)
    expect(c.id).toBeDefined()
    expect(c.name).toBe('Maria')
    expect(c.phone).toBe('+5511999999999')
    expect(c.email).toBeNull()
    expect(c.clientId).toBeNull()
  })
  it('creates contact with optional email', () => {
    const c = Contact.create({ ...baseInput, email: 'maria@x.com' })
    expect(c.email).toBe('maria@x.com')
  })
  it('rejects empty name', () => {
    expect(() => Contact.create({ ...baseInput, name: '' })).toThrow(/nome/i)
  })
  it('linkToClient sets clientId', () => {
    const c = Contact.create(baseInput)
    c.linkToClient('client-1')
    expect(c.clientId).toBe('client-1')
  })
  it('linkToClient is idempotent with same id', () => {
    const c = Contact.create(baseInput)
    c.linkToClient('client-1')
    c.linkToClient('client-1')
    expect(c.clientId).toBe('client-1')
  })
  it('linkToClient throws when already linked to different client', () => {
    const c = Contact.create(baseInput)
    c.linkToClient('client-1')
    expect(() => c.linkToClient('client-2')).toThrow(/já está vinculado/i)
  })
  it('toJSON returns plain data', () => {
    const c = Contact.create(baseInput)
    const json = c.toJSON()
    expect(json.organizationId).toBe('org-1')
    expect(json.name).toBe('Maria')
  })
})
