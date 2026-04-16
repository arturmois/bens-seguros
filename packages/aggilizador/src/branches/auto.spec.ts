import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AutoQuoteService } from './auto.js'
import type { EnumRegistry } from '../mappings/enum-registry.js'
import type { AutoPayloadBuilder } from '../builders/auto-payload-builder.js'
import type { AutoQuoteInput } from '../types/auto.js'

const SAMPLE_INPUT: AutoQuoteInput = {
  brokerId: 1366,
  insuranceBroker: 'lojacorr',
  insured: {
    cpf: '529.982.247-25',
    fullName: 'MARIA DA SILVA SANTOS',
    birthDate: '1985-03-15',
    gender: 'FEMALE',
    maritalStatus: 'MARRIED',
    cep: '01310-100',
    email: 'maria@email.com',
    cellPhone: { areaCode: '11', number: '999998888' },
    homePhone: null,
  },
  vehicle: {
    model: 'HB20S 1.0',
    manufacturer: 'HYUNDAI',
    manufactureYear: 2022,
    modelYear: 2023,
    fipeCode: '015220-0',
    isZeroKm: false,
    fuelType: 'FLEX',
    overnightCep: '01310-100',
    tracker: 'NONE',
    antitheft: 'NONE',
    isFinanced: false,
    hasGasKit: false,
    isArmored: false,
  },
  questionnaire: {
    residenceType: 'APARTMENT',
    residenceGarage: 'ELECTRONIC_GATE',
    workGarage: 'YES',
    studyGarage: 'NOT_STUDENT',
    vehicleUsage: 'PERSONAL',
    monthlyMileage: 1500,
    isPcd: false,
    livesWithUnder26: false,
  },
  insurance: {
    type: 'NEW',
    startDate: '2026-04-16',
    endDate: '2027-04-16',
    commission: 10,
  },
  mainDriver: {
    cpf: '529.982.247-25',
    fullName: 'MARIA DA SILVA SANTOS',
    birthDate: '1985-03-15',
    gender: 'FEMALE',
    maritalStatus: 'MARRIED',
    relationship: 'SELF',
  },
}

describe('AutoQuoteService', () => {
  let service: AutoQuoteService
  let mockBuilder: AutoPayloadBuilder
  let mockRegistry: EnumRegistry

  beforeEach(() => {
    mockBuilder = {
      buildContactPayload: vi.fn().mockResolvedValue({ BrokerId: 1366 }),
      buildSubmitPayload: vi
        .fn()
        .mockResolvedValue({ Id: 'abc', BrokerId: 1366 }),
    } as unknown as AutoPayloadBuilder

    mockRegistry = {
      getEnumList: vi
        .fn()
        .mockResolvedValue([{ key: '1', value: 'Masculino' }]),
    } as unknown as EnumRegistry

    service = new AutoQuoteService(
      'https://api.aggilizador.com.br',
      mockBuilder,
      mockRegistry
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('submits a quote via Contact then Auto endpoints', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ Id: 'mongo123', ErrorMessages: [] }), {
          status: 200,
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify('mongo123'), { status: 200 })
      )

    const result = await service.submitQuote(SAMPLE_INPUT)

    expect(result).toEqual({ id: 'mongo123' })
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(fetchSpy.mock.calls[0]?.[0]).toBe(
      'https://api.aggilizador.com.br/Auto/Contact'
    )
    expect(fetchSpy.mock.calls[1]?.[0]).toBe(
      'https://api.aggilizador.com.br/Auto'
    )
    expect(mockBuilder.buildContactPayload).toHaveBeenCalledWith(SAMPLE_INPUT)
    expect(mockBuilder.buildSubmitPayload).toHaveBeenCalledWith(
      SAMPLE_INPUT,
      'mongo123'
    )
  })

  it('throws AggilizadorBusinessError when Contact returns errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({ Id: '', ErrorMessages: ['CPF inválido'] }),
        { status: 200 }
      )
    )

    await expect(service.submitQuote(SAMPLE_INPUT)).rejects.toThrow(
      'CPF inválido'
    )
  })

  it('delegates getEnums to registry', async () => {
    const enums = await service.getEnums()
    expect(mockRegistry.getEnumList).toHaveBeenCalled()
    expect(enums.gender).toEqual([{ key: '1', value: 'Masculino' }])
  })
})
