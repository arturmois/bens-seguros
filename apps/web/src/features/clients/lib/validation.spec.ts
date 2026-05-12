import { describe, expect, it } from 'vitest'

import { extractExistingClientId, isValidCnpj, isValidCpf } from './validation'

describe('isValidCpf', () => {
  it('aceita CPFs com check-digit válido', () => {
    expect(isValidCpf('52998224725')).toBe(true)
    expect(isValidCpf('529.982.247-25')).toBe(true)
  })
  it('rejeita CPFs com check-digit inválido', () => {
    expect(isValidCpf('52998224726')).toBe(false)
    expect(isValidCpf('12345678901')).toBe(false)
  })
  it('rejeita sequências repetidas', () => {
    expect(isValidCpf('00000000000')).toBe(false)
    expect(isValidCpf('11111111111')).toBe(false)
    expect(isValidCpf('99999999999')).toBe(false)
  })
  it('rejeita strings com tamanho errado', () => {
    expect(isValidCpf('1234567890')).toBe(false)
    expect(isValidCpf('123456789012')).toBe(false)
    expect(isValidCpf('')).toBe(false)
  })
  it('rejeita strings com caracteres não numéricos após strip', () => {
    expect(isValidCpf('abc.def.ghi-jk')).toBe(false)
  })
})

describe('isValidCnpj', () => {
  it('aceita CNPJs com check-digit válido', () => {
    expect(isValidCnpj('11444777000161')).toBe(true)
    expect(isValidCnpj('11.444.777/0001-61')).toBe(true)
  })
  it('rejeita CNPJs com check-digit inválido', () => {
    expect(isValidCnpj('11444777000162')).toBe(false)
    expect(isValidCnpj('12345678000100')).toBe(false)
  })
  it('rejeita sequências repetidas', () => {
    expect(isValidCnpj('00000000000000')).toBe(false)
    expect(isValidCnpj('11111111111111')).toBe(false)
  })
  it('rejeita strings com tamanho errado', () => {
    expect(isValidCnpj('123')).toBe(false)
    expect(isValidCnpj('1144477700016')).toBe(false)
    expect(isValidCnpj('114447770001611')).toBe(false)
  })
})

describe('extractExistingClientId', () => {
  it('extrai id de um ApiError CLIENT_ALREADY_EXISTS com details', async () => {
    const { ApiError } = await import('@/lib/api-client')
    const error = new ApiError(409, 'CLIENT_ALREADY_EXISTS', 'Já existe', {
      existingClientId: 'client-42',
    })
    expect(extractExistingClientId(error)).toBe('client-42')
  })
  it('retorna null quando ApiError tem outro code', async () => {
    const { ApiError } = await import('@/lib/api-client')
    const error = new ApiError(409, 'SOMETHING_ELSE', 'msg', {
      existingClientId: 'client-42',
    })
    expect(extractExistingClientId(error)).toBeNull()
  })
  it('retorna null quando ApiError não tem details', async () => {
    const { ApiError } = await import('@/lib/api-client')
    const error = new ApiError(409, 'CLIENT_ALREADY_EXISTS', 'Já existe')
    expect(extractExistingClientId(error)).toBeNull()
  })
  it('retorna null pra qualquer shape que não seja ApiError', () => {
    expect(extractExistingClientId(null)).toBeNull()
    expect(extractExistingClientId(undefined)).toBeNull()
    expect(extractExistingClientId('string')).toBeNull()
    expect(extractExistingClientId({})).toBeNull()
    expect(
      extractExistingClientId(new Error('genuino mas sem details'))
    ).toBeNull()
  })
})
