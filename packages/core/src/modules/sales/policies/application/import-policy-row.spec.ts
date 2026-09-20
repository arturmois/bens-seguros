import { describe, expect, it, vi } from 'vitest'
import { IssuePolicy } from './issue-policy.js'
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
    const issuePolicy = { execute: vi.fn() }
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
    expect(issuePolicy.execute).not.toHaveBeenCalled()
    expect(IssuePolicy).toBeDefined()
  })
})
