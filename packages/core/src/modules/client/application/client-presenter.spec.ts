import { describe, expect, it } from 'vitest'
import type { ClientData } from '../domain/client-repository.js'
import { ClientPresenter } from './client-presenter.js'

function makeClient(overrides: Partial<ClientData> = {}): ClientData {
  return {
    id: 'client-1',
    organizationId: 'org-1',
    legalName: 'Maria Silva',
    document: '12345678901',
    documentHash: 'hash-test',
    personType: 'INDIVIDUAL',
    profession: 'Engenheira',
    maritalStatus: 'SINGLE',
    address: { street: 'Rua A', city: 'SP', state: 'SP', zip: '01000000' },
    fiscalBirthDate: new Date('1990-01-15'),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  }
}

describe('ClientPresenter.toList', () => {
  it('masks the document and exposes fiscal-only fields', () => {
    const client = makeClient()
    const result = ClientPresenter.toList(client)

    expect(result.document).toBe('***.***.789-01')
    expect(result.legalName).toBe('Maria Silva')
    expect(result).not.toHaveProperty('email')
    expect(result).not.toHaveProperty('phone')
    expect(result).not.toHaveProperty('address')
    expect(result).not.toHaveProperty('profession')
    expect(result).not.toHaveProperty('maritalStatus')
    expect(result).not.toHaveProperty('documentEncrypted')
    expect(result).not.toHaveProperty('documentHash')
  })

  it('includes only id, legalName, personType, document, createdAt', () => {
    const client = makeClient()
    const result = ClientPresenter.toList(client)

    expect(Object.keys(result).sort()).toEqual(
      ['id', 'legalName', 'personType', 'document', 'createdAt'].sort()
    )
  })

  it('masks a CNPJ document', () => {
    const client = makeClient({ document: '12345678000195' })
    const result = ClientPresenter.toList(client)

    expect(result.document).toBe('**.***.***/0001-95')
  })

  it('never includes documentEncrypted or documentHash', () => {
    const client = makeClient()
    const result = ClientPresenter.toList(client)
    const keys = Object.keys(result)

    expect(keys).not.toContain('documentEncrypted')
    expect(keys).not.toContain('documentHash')
    expect(keys).not.toContain('organizationId')
  })
})

describe('ClientPresenter.toDetail', () => {
  it('shows full document and fiscal fields for OWNER role', () => {
    const client = makeClient()
    const result = ClientPresenter.toDetail(client, {
      role: 'OWNER',
      userId: 'other-user',
    })

    expect(result.document).toBe('12345678901')
    expect(result.profession).toBe('Engenheira')
    expect(result.fiscalBirthDate).toBeInstanceOf(Date)
    expect(result.address).toBeDefined()
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

  it('masks document for COMMERCIAL', () => {
    const client = makeClient()
    const result = ClientPresenter.toDetail(client, {
      role: 'COMMERCIAL',
      userId: 'user-sales-1',
    })

    expect(result.document).toBe('***.***.789-01')
    expect(result).not.toHaveProperty('profession')
    expect(result).not.toHaveProperty('address')
    expect(result).not.toHaveProperty('fiscalBirthDate')
  })

  it('masks document for VIEWER', () => {
    const client = makeClient()
    const result = ClientPresenter.toDetail(client, {
      role: 'VIEWER',
      userId: 'user-1',
    })

    expect(result.document).toBe('***.***.789-01')
    expect(result).not.toHaveProperty('profession')
    expect(result).not.toHaveProperty('address')
    expect(result).not.toHaveProperty('fiscalBirthDate')
  })

  it('never includes organizationId in response', () => {
    const client = makeClient()
    const result = ClientPresenter.toDetail(client, {
      role: 'OWNER',
      userId: 'user-1',
    })

    expect(result).not.toHaveProperty('organizationId')
  })

  it('never includes documentEncrypted or documentHash even for OWNER', () => {
    const client = makeClient()
    const result = ClientPresenter.toDetail(client, {
      role: 'OWNER',
      userId: 'user-1',
    })
    const keys = Object.keys(result)

    expect(keys).not.toContain('documentEncrypted')
    expect(keys).not.toContain('documentHash')
  })
})
