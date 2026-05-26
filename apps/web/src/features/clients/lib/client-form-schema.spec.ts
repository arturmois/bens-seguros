import { describe, expect, it } from 'vitest'

import { clientFormSchema } from './client-form-schema'

const baseValues = {
  legalName: 'Empresa Teste LTDA',
  personType: 'COMPANY' as const,
  profession: null,
  maritalStatus: null,
  address: null,
  fiscalBirthDate: null,
}

describe('clientFormSchema — document field', () => {
  it('aceita CNPJ formatado (18 chars) com 14 dígitos válidos', () => {
    const result = clientFormSchema.safeParse({
      ...baseValues,
      document: '11.222.333/0001-81',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.document).toBe('11222333000181')
    }
  })

  it('aceita CNPJ raw (14 dígitos)', () => {
    const result = clientFormSchema.safeParse({
      ...baseValues,
      document: '11222333000181',
    })
    expect(result.success).toBe(true)
  })

  it('aceita CPF formatado (14 chars) com 11 dígitos válidos', () => {
    const result = clientFormSchema.safeParse({
      ...baseValues,
      personType: 'INDIVIDUAL',
      legalName: 'Maria Silva',
      document: '529.982.247-25',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.document).toBe('52998224725')
    }
  })

  it('rejeita documento parcial com menos de 11 dígitos', () => {
    const result = clientFormSchema.safeParse({
      ...baseValues,
      document: '11.222.333/0001',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'document')
      expect(issue?.message).toContain('11 (CPF) ou 14 (CNPJ)')
    }
  })

  it('rejeita documento com 12-13 dígitos (entre CPF e CNPJ)', () => {
    const result = clientFormSchema.safeParse({
      ...baseValues,
      document: '123456789012',
    })
    expect(result.success).toBe(false)
  })

  it('rejeita CNPJ com checksum inválido', () => {
    const result = clientFormSchema.safeParse({
      ...baseValues,
      document: '11.222.333/0001-00',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'document')
      expect(issue?.message).toBe('CNPJ inválido')
    }
  })

  it('rejeita CPF com checksum inválido', () => {
    const result = clientFormSchema.safeParse({
      ...baseValues,
      personType: 'INDIVIDUAL',
      legalName: 'João Silva',
      document: '123.456.789-00',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'document')
      expect(issue?.message).toBe('CPF inválido')
    }
  })
})
