import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import {
  ImportPolicyRow,
  type ImportPolicyStores,
} from './import-policy-row.js'

function makeStores(
  overrides: Partial<ImportPolicyStores> = {}
): ImportPolicyStores {
  return {
    findByDocumentHash: vi.fn().mockResolvedValue({ id: 'client-1' }),
    findOldestByClientId: vi.fn().mockResolvedValue({ id: 'contact-1' }),
    findByPolicyNumber: vi.fn().mockResolvedValue(null),
    createImportedIssued: vi.fn().mockResolvedValue({ id: 'prop-1' }),
    createImportedPolicy: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

const raw = {
  'Numero Apolice': 'POL-100',
  'CPF/CNPJ Cliente': '111.444.777-35',
  Ramo: 'AUTO',
  'Premio (R$)': 1500,
  'Inicio Vigencia': '2026-01-01',
  'Fim Vigencia': '2027-01-01',
  Status: 'ACTIVE',
}

describe('ImportPolicyRow', () => {
  it('existing policyNumber increments skipped', async () => {
    const stores = makeStores({
      findByPolicyNumber: vi.fn().mockResolvedValue({ id: 'pol-existing' }),
    })
    const useCase = new ImportPolicyRow(stores)
    const result = await useCase.execute({
      organizationId: 'org-1',
      userId: 'user-1',
      raw,
    })
    expect(result).toEqual({ status: 'skipped' })
    expect(stores.createImportedIssued).not.toHaveBeenCalled()
    expect(stores.createImportedPolicy).not.toHaveBeenCalled()
  })

  it('creates POLICY_ISSUED proposal commission 0 without IssuePolicy', async () => {
    const stores = makeStores()
    const useCase = new ImportPolicyRow(stores)
    const result = await useCase.execute({
      organizationId: 'org-1',
      userId: 'user-1',
      raw,
    })
    expect(result).toEqual({ status: 'created' })
    expect(stores.createImportedIssued).toHaveBeenCalledWith({
      organizationId: 'org-1',
      contactId: 'contact-1',
      salespersonId: 'user-1',
      branch: 'AUTO',
      premiumValueInCents: 150000,
      stage: 'POLICY_ISSUED',
      boardType: 'NEW_INSURANCE',
      commissionPercentageInCents: 0,
    })
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), 'import-policy-row.ts'),
      'utf8'
    )
    expect(source).not.toMatch(/IssuePolicy/)
  })

  it('repo throw returns failed and does not create a policy', async () => {
    const stores = makeStores({
      createImportedIssued: vi
        .fn()
        .mockRejectedValue(new Error('write failed')),
    })
    const useCase = new ImportPolicyRow(stores)
    const result = await useCase.execute({
      organizationId: 'org-1',
      userId: 'user-1',
      raw,
    })
    expect(result).toEqual({ status: 'failed', message: 'write failed' })
    expect(stores.createImportedPolicy).not.toHaveBeenCalled()
  })
})
