import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  LookupProviderUnavailableError,
  PlateNotFoundError,
} from '../domain/vehicle-lookup-errors.js'
import { LookupProviderConsultarPlaca } from './lookup-provider-consultar-placa.js'

vi.mock('@repo/env', () => ({
  env: {
    CONSULTAR_PLACA_EMAIL: 'user@example.com',
    CONSULTAR_PLACA_API_KEY: 'test-api-key',
  },
}))

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const SUCCESS_BODY = {
  status: 'ok',
  mensagem: 'Consulta EXEMPLO realizada com sucesso!',
  dados: {
    informacoes_veiculo: {
      dados_veiculo: {
        placa: 'AAA0000',
        chassi: '00AAA00A00A000000',
        ano_fabricacao: '2014',
        ano_modelo: '2015',
        marca: 'HYUNDAI',
        modelo: 'HYUNDAI/HB20 1.0M COMFOR',
        cor: 'Branca',
        combustivel: 'Álcool / Gasolina',
      },
    },
  },
}

describe('LookupProviderConsultarPlaca', () => {
  let provider: LookupProviderConsultarPlaca
  let fetchSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    provider = new LookupProviderConsultarPlaca()
    fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('maps successful response to VehicleData', async () => {
    fetchSpy.mockResolvedValue(jsonResponse(SUCCESS_BODY, 200))

    const result = await provider.lookup({ plate: 'AAA0000' })

    expect(result.vehicle).toBe('HYUNDAI HYUNDAI/HB20 1.0M COMFOR')
    expect(result.manufacturingYear).toBe(2014)
    expect(result.modelYear).toBe(2015)
    expect(result.color).toBe('BRANCA')
    expect(result.fuelType).toBe('FLEX')
    expect(result.chassi).toBe('00AAA00A00A000000')
    expect(result.plate).toBe('AAA0000')
  })

  it('sends Basic Auth header and uses query param placa', async () => {
    fetchSpy.mockResolvedValue(jsonResponse(SUCCESS_BODY, 200))

    await provider.lookup({ plate: 'ABC1D23' })

    const [url, init] = fetchSpy.mock.calls[0]!
    expect(String(url)).toContain('/v2/consultarPlaca')
    expect(String(url)).toContain('placa=ABC1D23')
    const auth = (init as RequestInit).headers as Record<string, string>
    const authHeader = auth.Authorization ?? ''
    expect(authHeader).toMatch(/^Basic /)
    const decoded = Buffer.from(
      authHeader.replace('Basic ', ''),
      'base64'
    ).toString('utf8')
    expect(decoded).toBe('user@example.com:test-api-key')
  })

  it('throws PlateNotFoundError when chassi-only lookup is requested', async () => {
    await expect(
      provider.lookup({ chassi: '00AAA00A00A000000' })
    ).rejects.toBeInstanceOf(PlateNotFoundError)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('throws PlateNotFoundError when API returns "placa não encontrada"', async () => {
    fetchSpy.mockResolvedValue(
      jsonResponse(
        { status: 'erro', mensagem: 'Placa não encontrada na base.' },
        200
      )
    )

    await expect(provider.lookup({ plate: 'XYZ9999' })).rejects.toBeInstanceOf(
      PlateNotFoundError
    )
  })

  it('throws LookupProviderUnavailableError on HTTP 402 (credit exhausted)', async () => {
    fetchSpy.mockResolvedValue(
      jsonResponse(
        {
          status: 'erro',
          tipo_do_erro: 'credito_insuficiente',
          mensagem: 'Créditos insuficientes',
        },
        402
      )
    )

    await expect(provider.lookup({ plate: 'ABC1D23' })).rejects.toBeInstanceOf(
      LookupProviderUnavailableError
    )
  })

  it('throws LookupProviderUnavailableError on HTTP 401/403', async () => {
    fetchSpy.mockResolvedValue(jsonResponse({ error: 'unauthorized' }, 401))
    await expect(provider.lookup({ plate: 'ABC1D23' })).rejects.toBeInstanceOf(
      LookupProviderUnavailableError
    )

    fetchSpy.mockResolvedValue(jsonResponse({ error: 'forbidden' }, 403))
    await expect(provider.lookup({ plate: 'ABC1D23' })).rejects.toBeInstanceOf(
      LookupProviderUnavailableError
    )
  })

  it('throws LookupProviderUnavailableError on HTTP 5xx', async () => {
    fetchSpy.mockResolvedValue(jsonResponse({}, 503))
    await expect(provider.lookup({ plate: 'ABC1D23' })).rejects.toBeInstanceOf(
      LookupProviderUnavailableError
    )
  })

  it('throws LookupProviderUnavailableError on network/timeout', async () => {
    fetchSpy.mockRejectedValue(new Error('aborted'))
    await expect(provider.lookup({ plate: 'ABC1D23' })).rejects.toBeInstanceOf(
      LookupProviderUnavailableError
    )
  })

  it('throws PlateNotFoundError when dados_veiculo missing in response', async () => {
    fetchSpy.mockResolvedValue(
      jsonResponse({ status: 'ok', dados: { informacoes_veiculo: {} } }, 200)
    )
    await expect(provider.lookup({ plate: 'ABC1D23' })).rejects.toBeInstanceOf(
      PlateNotFoundError
    )
  })

  it('normalizes fuel types correctly', async () => {
    const cases: Array<{
      readonly combustivel: string
      readonly expected: string
    }> = [
      { combustivel: 'Álcool / Gasolina', expected: 'FLEX' },
      { combustivel: 'Flex', expected: 'FLEX' },
      { combustivel: 'Gasolina', expected: 'GASOLINE' },
      { combustivel: 'Etanol', expected: 'ETHANOL' },
      { combustivel: 'Diesel', expected: 'DIESEL' },
      { combustivel: 'Elétrico', expected: 'ELECTRIC' },
      { combustivel: 'Híbrido', expected: 'HYBRID' },
      { combustivel: 'Hidrogênio', expected: 'OTHER' },
    ]
    for (const { combustivel, expected } of cases) {
      fetchSpy.mockResolvedValue(
        jsonResponse(
          {
            ...SUCCESS_BODY,
            dados: {
              informacoes_veiculo: {
                dados_veiculo: {
                  ...SUCCESS_BODY.dados.informacoes_veiculo.dados_veiculo,
                  combustivel,
                },
              },
            },
          },
          200
        )
      )
      const result = await provider.lookup({ plate: 'AAA0000' })
      expect(result.fuelType).toBe(expected)
    }
  })
})

describe('LookupProviderConsultarPlaca (no credentials)', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('throws an error with code PROVIDER_UNAVAILABLE when credentials are not configured', async () => {
    vi.doMock('@repo/env', () => ({
      env: {
        CONSULTAR_PLACA_EMAIL: undefined,
        CONSULTAR_PLACA_API_KEY: undefined,
      },
    }))
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    try {
      const { LookupProviderConsultarPlaca: ProviderNoCreds } =
        await import('./lookup-provider-consultar-placa.js')
      const noCredsProvider = new ProviderNoCreds()
      let caught: unknown = null
      try {
        await noCredsProvider.lookup({ plate: 'ABC1D23' })
      } catch (err) {
        caught = err
      }
      expect(caught).not.toBeNull()
      expect((caught as { code?: string }).code).toBe('PROVIDER_UNAVAILABLE')
      expect(fetchSpy).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllGlobals()
      vi.doUnmock('@repo/env')
    }
  })
})
