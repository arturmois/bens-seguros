import { describe, expect, it, vi } from 'vitest'
import { ImportPolicyRow } from '@repo/core'
import { runCsvImport } from '../csv-import-processor.js'

const missingClientCpf = '000.000.000-00'
const missingContactCpf = '111.444.777-35'
const newCpf = '390.533.447-05'

describe('csv-import-processor', () => {
  it('characterization fixture counts and pt-BR messages', async () => {
    const stores = {
      findByDocumentHash: vi.fn(async (hash: string) => {
        const { hashDocument } = await import('@repo/shared')
        if (hash === hashDocument(missingClientCpf)) return null
        if (hash === hashDocument(missingContactCpf)) return { id: 'client-nc' }
        if (hash === hashDocument(newCpf)) return { id: 'client-new' }
        return null
      }),
      findOldestByClientId: vi.fn(async (clientId: string) => {
        if (clientId === 'client-new') return { id: 'contact-new' }
        return null
      }),
      findByPolicyNumber: vi.fn(async (policyNumber: string) => {
        if (policyNumber === 'POL-DUP') return { id: 'pol-dup' }
        return null
      }),
      createImportedIssued: vi.fn().mockResolvedValue({ id: 'prop-1' }),
      createImportedPolicy: vi.fn().mockResolvedValue(undefined),
    }
    const importPolicyRow = new ImportPolicyRow(stores)
    const rows = [
      {
        'Numero Apolice': 'POL-NEW',
        'CPF/CNPJ Cliente': newCpf,
        Ramo: 'AUTO',
        'Premio (R$)': 1000,
        'Inicio Vigencia': '2026-01-01',
        'Fim Vigencia': '2027-01-01',
        Status: 'ACTIVE',
      },
      {
        'Numero Apolice': 'POL-DUP',
        'CPF/CNPJ Cliente': newCpf,
        Ramo: 'AUTO',
        'Premio (R$)': 1000,
        'Inicio Vigencia': '2026-01-01',
        'Fim Vigencia': '2027-01-01',
        Status: 'ACTIVE',
      },
      {
        'Numero Apolice': 'POL-MISS',
        'CPF/CNPJ Cliente': missingClientCpf,
        Ramo: 'AUTO',
        'Premio (R$)': 1000,
        'Inicio Vigencia': '2026-01-01',
        'Fim Vigencia': '2027-01-01',
        Status: 'ACTIVE',
      },
      {
        'Numero Apolice': 'POL-NOC',
        'CPF/CNPJ Cliente': missingContactCpf,
        Ramo: 'AUTO',
        'Premio (R$)': 1000,
        'Inicio Vigencia': '2026-01-01',
        'Fim Vigencia': '2027-01-01',
        Status: 'ACTIVE',
      },
    ]
    const progress = await runCsvImport(
      {
        data: {
          entityType: 'policy',
          organizationId: 'org-1',
          userId: 'user-1',
          rows,
          totalRows: rows.length,
        },
        updateProgress: vi.fn().mockResolvedValue(undefined),
      },
      {
        importClientRow: { execute: vi.fn() },
        importPolicyRow,
      }
    )
    expect(progress.created).toBe(1)
    expect(progress.skipped).toBe(1)
    expect(progress.failed).toBe(2)
    expect(progress.errors.map((error) => error.message)).toEqual([
      `Cliente com CPF/CNPJ ${missingClientCpf} não encontrado`,
      `Cliente com CPF/CNPJ ${missingContactCpf} não tem Contact vinculado`,
    ])
  })
})
