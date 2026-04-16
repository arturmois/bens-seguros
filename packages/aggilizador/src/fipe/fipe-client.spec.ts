import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FipeClient } from './fipe-client.js'

describe('FipeClient', () => {
  let client: FipeClient

  beforeEach(() => {
    client = new FipeClient('https://fipe.agger.com.br')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('searches models by name and year', async () => {
    const mockModels = [
      {
        Modelo: 'HB20 1.0',
        Marca: 'HYUNDAI',
        Codigo: '015220-0',
        TipoVeiculo: 0,
      },
    ]
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify('mock-token'), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockModels), { status: 200 })
      )

    const result = await client.searchModels({ model: 'HB20', year: 2023 })
    expect(result).toEqual([
      {
        model: 'HB20 1.0',
        manufacturer: 'HYUNDAI',
        fipeCode: '015220-0',
        vehicleType: 0,
      },
    ])
  })

  it('returns empty array when search has no results', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify('mock-token'), { status: 200 })
      )
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))

    const result = await client.searchModels({
      model: 'XYZNONEXIST',
      year: 2023,
    })
    expect(result).toEqual([])
  })

  it('caches auth token across calls', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify('token1'), { status: 200 })
      )
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))

    await client.searchModels({ model: 'A', year: 2023 })
    await client.searchModels({ model: 'B', year: 2023 })

    // auth called once, search called twice = 3 total
    expect(fetchSpy).toHaveBeenCalledTimes(3)
  })
})
