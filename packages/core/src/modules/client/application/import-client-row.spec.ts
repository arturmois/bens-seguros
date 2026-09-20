import { describe, expect, it, vi } from 'vitest'
import type { ClientData } from '../domain/client-repository.js'
import { ImportClientRow } from './import-client-row.js'

const existingClient: ClientData = {
  id: 'client-1',
  organizationId: 'org-1',
  legalName: 'João Silva',
  document: '11144477735',
  documentHash: 'hash-1',
  personType: 'INDIVIDUAL',
  profession: null,
  maritalStatus: null,
  address: null,
  fiscalBirthDate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
}

describe('ImportClientRow', () => {
  it('existing documentHash increments skipped', async () => {
    const saveClient = vi.fn()
    const saveContact = vi.fn()
    const useCase = new ImportClientRow(
      {
        findByDocumentHash: vi.fn().mockResolvedValue(existingClient),
        save: saveClient,
      },
      {
        findOldestByClientId: vi.fn().mockResolvedValue({ id: 'contact-1' }),
        save: saveContact,
      }
    )
    const result = await useCase.execute({
      organizationId: 'org-1',
      userId: 'user-1',
      raw: { Nome: 'João Silva', 'CPF/CNPJ': '111.444.777-35' },
    })
    expect(result).toEqual({ status: 'skipped' })
    expect(saveClient).not.toHaveBeenCalled()
  })

  it('new document creates client and contact IMPORT consentLgpd true', async () => {
    const saveClient = vi.fn().mockResolvedValue({
      ...existingClient,
      id: 'client-new',
    })
    const saveContact = vi.fn().mockResolvedValue({})
    const useCase = new ImportClientRow(
      {
        findByDocumentHash: vi.fn().mockResolvedValue(null),
        save: saveClient,
      },
      {
        findOldestByClientId: vi.fn(),
        save: saveContact,
      }
    )
    const result = await useCase.execute({
      organizationId: 'org-1',
      userId: 'user-1',
      raw: { Nome: 'Maria Santos', 'CPF/CNPJ': '390.533.447-05' },
    })
    expect(result).toEqual({ status: 'created' })
    expect(saveClient).toHaveBeenCalledOnce()
    expect(saveContact).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'IMPORT',
        consentLgpd: true,
        clientId: 'client-new',
        organizationId: 'org-1',
        salespersonId: 'user-1',
      })
    )
  })

  it('repo throw returns failed and does not create a second client', async () => {
    const saveClient = vi.fn().mockRejectedValue(new Error('write failed'))
    const useCase = new ImportClientRow(
      {
        findByDocumentHash: vi.fn().mockResolvedValue(null),
        save: saveClient,
      },
      {
        findOldestByClientId: vi.fn(),
        save: vi.fn(),
      }
    )
    const result = await useCase.execute({
      organizationId: 'org-1',
      userId: 'user-1',
      raw: { Nome: 'Erro', 'CPF/CNPJ': '111.444.777-35' },
    })
    expect(result).toEqual({ status: 'failed', message: 'write failed' })
  })
})
