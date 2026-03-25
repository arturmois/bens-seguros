import { describe, expect, it } from 'vitest'
import type { ClientData } from '../domain/client-repository.js'
import { ClientPresenter } from './client-presenter.js'

function makeClient(overrides: Partial<ClientData> = {}): ClientData {
  return {
    id: 'client-1',
    organizationId: 'org-1',
    name: 'Maria Silva',
    document: '12345678901',
    type: 'CLIENT',
    email: 'maria@test.com',
    phone: '11999990000',
    birthDate: new Date('1990-01-15'),
    profession: 'Engenheira',
    maritalStatus: 'SINGLE',
    address: { street: 'Rua A', city: 'SP', state: 'SP', zip: '01000000' },
    tags: ['vip'],
    consentLgpd: true,
    salespersonId: 'user-sales-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('ClientPresenter.toList', () => {
  it('masks the document for all roles', () => {
    const client = makeClient()
    const result = ClientPresenter.toList(client)

    expect(result.document).toBe('***.***.789-01')
    expect(result).not.toHaveProperty('email')
    expect(result).not.toHaveProperty('phone')
    expect(result).not.toHaveProperty('address')
    expect(result).not.toHaveProperty('birthDate')
    expect(result).not.toHaveProperty('profession')
    expect(result).not.toHaveProperty('maritalStatus')
    expect(result).not.toHaveProperty('documentEncrypted')
    expect(result).not.toHaveProperty('documentHash')
  })

  it('includes only id, name, type, tags, document, createdAt', () => {
    const client = makeClient()
    const result = ClientPresenter.toList(client)

    expect(Object.keys(result).sort()).toEqual(
      ['id', 'name', 'type', 'tags', 'document', 'createdAt'].sort()
    )
  })

  it('masks a CNPJ document', () => {
    const client = makeClient({ document: '12345678000195' })
    const result = ClientPresenter.toList(client)

    expect(result.document).toBe('**.***.***/0001-95')
  })
})

describe('ClientPresenter.toDetail', () => {
  it('shows full document for OWNER role', () => {
    const client = makeClient()
    const result = ClientPresenter.toDetail(client, {
      role: 'OWNER',
      userId: 'other-user',
    })

    expect(result.document).toBe('12345678901')
    expect(result.email).toBe('maria@test.com')
    expect(result.phone).toBe('11999990000')
  })

  it('shows full document for ADMIN role', () => {
    const client = makeClient()
    const result = ClientPresenter.toDetail(client, {
      role: 'ADMIN',
      userId: 'other-user',
    })

    expect(result.document).toBe('12345678901')
  })

  it('shows full document for MANAGER role', () => {
    const client = makeClient()
    const result = ClientPresenter.toDetail(client, {
      role: 'MANAGER',
      userId: 'other-user',
    })

    expect(result.document).toBe('12345678901')
  })

  it('shows full document for COMMERCIAL viewing own client', () => {
    const client = makeClient({ salespersonId: 'user-sales-1' })
    const result = ClientPresenter.toDetail(client, {
      role: 'COMMERCIAL',
      userId: 'user-sales-1',
    })

    expect(result.document).toBe('12345678901')
    expect(result.email).toBe('maria@test.com')
    expect(result.phone).toBe('11999990000')
    expect(result.birthDate).toBeInstanceOf(Date)
    expect(result.address).toBeDefined()
  })

  it('masks document for COMMERCIAL viewing another salesperson client', () => {
    const client = makeClient({ salespersonId: 'user-sales-other' })
    const result = ClientPresenter.toDetail(client, {
      role: 'COMMERCIAL',
      userId: 'user-sales-1',
    })

    expect(result.document).toBe('***.***.789-01')
    expect(result).not.toHaveProperty('email')
    expect(result).not.toHaveProperty('phone')
    expect(result).not.toHaveProperty('address')
    expect(result).not.toHaveProperty('birthDate')
  })

  it('masks document for COMMERCIAL when client has no salesperson', () => {
    const client = makeClient({ salespersonId: null })
    const result = ClientPresenter.toDetail(client, {
      role: 'COMMERCIAL',
      userId: 'user-sales-1',
    })

    expect(result.document).toBe('***.***.789-01')
  })

  it('masks document for VIEWER regardless', () => {
    const client = makeClient({ salespersonId: 'user-sales-1' })
    const result = ClientPresenter.toDetail(client, {
      role: 'VIEWER',
      userId: 'user-sales-1',
    })

    expect(result.document).toBe('***.***.789-01')
    expect(result).not.toHaveProperty('email')
    expect(result).not.toHaveProperty('phone')
    expect(result).not.toHaveProperty('address')
    expect(result).not.toHaveProperty('birthDate')
  })

  it('never includes organizationId in response', () => {
    const client = makeClient()
    const result = ClientPresenter.toDetail(client, {
      role: 'OWNER',
      userId: 'user-1',
    })

    expect(result).not.toHaveProperty('organizationId')
  })

  it('never includes salespersonId in response', () => {
    const client = makeClient()
    const result = ClientPresenter.toDetail(client, {
      role: 'OWNER',
      userId: 'user-1',
    })

    expect(result).not.toHaveProperty('salespersonId')
  })
})
