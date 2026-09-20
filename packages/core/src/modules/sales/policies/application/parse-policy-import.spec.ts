import { describe, expect, it, vi } from 'vitest'
import type { PolicyRepository } from '../domain/policy-repository.js'
import { CsvImportError } from '../../../../shared/csv-import-types.js'
import { ParsePolicyImport } from './parse-policy-import.js'

function createMockRepo(): PolicyRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findByPolicyNumber: vi.fn(),
    findMany: vi.fn(),
    cancel: vi.fn(),
  }
}

describe('ParsePolicyImport', () => {
  it('parses valid CSV and returns validation summary', async () => {
    const repo = createMockRepo()
    const useCase = new ParsePolicyImport(repo)
    const csv = [
      'Numero Apolice,CPF/CNPJ Cliente,Ramo,Premio (R$),Inicio Vigencia,Fim Vigencia',
      'POL-001,12345678900,AUTO,100000,2024-01-01,2025-01-01',
      'POL-002,98765432100,LIFE,50000,2024-06-01,2025-06-01',
    ].join('\n')
    const result = await useCase.execute(csv, 'org-1')
    expect(result.jobId).toBeDefined()
    expect(result.validationSummary.total).toBe(2)
    expect(result.validationSummary.valid).toBeGreaterThan(0)
  })
  it('throws NO_VALID_ROWS when CSV is empty', async () => {
    const repo = createMockRepo()
    const useCase = new ParsePolicyImport(repo)
    const csv = 'Numero Apolice,CPF/CNPJ Cliente,Ramo\n'
    await expect(useCase.execute(csv, 'org-1')).rejects.toThrow(CsvImportError)
  })
  it('throws TOO_MANY_ERRORS when more than 50% rows are invalid', async () => {
    const repo = createMockRepo()
    const useCase = new ParsePolicyImport(repo)
    const header =
      'Numero Apolice,CPF/CNPJ Cliente,Ramo,Premio (R$),Inicio Vigencia,Fim Vigencia'
    const invalidRows = Array.from({ length: 8 }, () => ',,,,,').join('\n')
    const validRow = 'POL-001,12345678900,AUTO,100000,2024-01-01,2025-01-01'
    const csv = [header, invalidRows, validRow].join('\n')
    await expect(useCase.execute(csv, 'org-1')).rejects.toThrow(CsvImportError)
  })
})
