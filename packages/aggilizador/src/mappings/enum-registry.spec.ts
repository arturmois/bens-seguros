import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EnumRegistry } from './enum-registry.js'

describe('EnumRegistry', () => {
  let registry: EnumRegistry
  beforeEach(() => {
    registry = new EnumRegistry('https://api.aggilizador.com.br')
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  it('resolves enum from hardcoded defaults when API is unavailable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'))
    const result = await registry.resolve('Sexo', 'FEMALE')
    expect(result).toBe('2')
  })
  it('caches API response after first fetch', async () => {
    const mockResponse = {
      Sexo: [
        { Key: '1', Value: 'Masculino' },
        { Key: '2', Value: 'Feminino' },
      ],
    }
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      )
    await registry.resolve('Sexo', 'MALE')
    await registry.resolve('Sexo', 'FEMALE')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })
  it('invalidates cache on demand', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'))
    await registry.resolve('Sexo', 'MALE')
    registry.invalidate()
    await registry.resolve('Sexo', 'MALE')
    expect(globalThis.fetch).toHaveBeenCalledTimes(2)
  })
  it('returns all enums for a given API field', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'))
    const enums = await registry.getEnumList('Sexo')
    expect(enums).toEqual([
      { key: '1', value: 'Masculino' },
      { key: '2', value: 'Feminino' },
    ])
  })
})
