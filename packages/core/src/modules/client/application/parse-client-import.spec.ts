// packages/core/src/modules/client/application/parse-client-import.spec.ts
import { describe, expect, it, vi } from 'vitest'
import type { ClientRepository } from '../domain/client-repository.js'
import { CsvImportError } from '../../../shared/csv-import-types.js'
import { ParseClientImport } from './parse-client-import.js'

function createMockRepo(): ClientRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    findByDocument: vi.fn(),
  }
}

describe('ParseClientImport', () => {
  it('parses valid CSV and returns validation summary', async () => {
    const repo = createMockRepo()
    const useCase = new ParseClientImport(repo)
    const csv = [
      'Nome,CPF/CNPJ,Tipo,Email,Telefone',
      'Joao Silva,12345678900,CLIENT,joao@test.com,11999990000',
      'Maria Santos,98765432100,CLIENT,maria@test.com,11888880000',
    ].join('\n')

    const result = await useCase.execute(csv, 'org-1')

    expect(result.jobId).toBeDefined()
    expect(result.validationSummary.total).toBe(2)
    expect(result.validationSummary.valid).toBeGreaterThan(0)
  })

  it('throws NO_VALID_ROWS when CSV is empty', async () => {
    const repo = createMockRepo()
    const useCase = new ParseClientImport(repo)
    const csv = 'Nome,CPF/CNPJ,Tipo\n'

    await expect(useCase.execute(csv, 'org-1')).rejects.toThrow(CsvImportError)
  })

  it('throws TOO_MANY_ERRORS when more than 50% rows are invalid', async () => {
    const repo = createMockRepo()
    const useCase = new ParseClientImport(repo)
    const header = 'Nome,CPF/CNPJ,Tipo,Email,Telefone'
    const invalidRows = Array.from({ length: 8 }, () => ',,,,').join('\n')
    const validRow = 'Joao,12345678900,CLIENT,j@test.com,11999990000'
    const csv = [header, invalidRows, validRow].join('\n')

    await expect(useCase.execute(csv, 'org-1')).rejects.toThrow(CsvImportError)
  })
})
