import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AutoPayloadBuilder } from './auto-payload-builder.js'
import type { EnumRegistry } from '../mappings/enum-registry.js'
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
    model: 'HB20S COPA MUNDO QATAR 1.0 FLEX MEC.',
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

function createMockRegistry(): EnumRegistry {
  return {
    resolve: vi.fn(async (_field: string, key: string) => {
      const map: Record<string, string> = {
        FEMALE: '2',
        MARRIED: '1',
        FLEX: '1',
        APARTMENT: '2',
        ELECTRONIC_GATE: '1',
        YES: '2',
        NOT_STUDENT: '3',
        PERSONAL: '0',
        NONE: '0',
        NEW: '0',
        SELF: '0',
      }
      return map[key] ?? '0'
    }),
  } as unknown as EnumRegistry
}

describe('AutoPayloadBuilder', () => {
  let builder: AutoPayloadBuilder
  let registry: EnumRegistry
  beforeEach(() => {
    registry = createMockRegistry()
    builder = new AutoPayloadBuilder(registry)
  })
  it('builds contact payload with correct structure', async () => {
    const payload = await builder.buildContactPayload(SAMPLE_INPUT)
    expect(payload.BrokerId).toBe(1366)
    expect(payload.InsuranceBroker).toBe('lojacorr')
    expect(payload.CalculationType).toBe(1)
    expect(payload.Id).toBeNull()
    expect(payload.Data.CpfCnpj).toBe('529.982.247-25')
    expect(payload.Data.NomeCompleto).toBe('MARIA DA SILVA SANTOS')
    expect(payload.Data.Sexo).toBe('2')
    expect(payload.Data.EstadoCivil).toBe('1')
    expect(payload.Data.Email).toBe('maria@email.com')
    expect(payload.Data.TelefoneCelular).toEqual({
      Ddd: '(11)',
      Numero: '99999-8888',
    })
    expect(payload.Data.TelefoneResidencial).toEqual({
      Ddd: null,
      Numero: null,
    })
  })
  it('formats phone number with parentheses and dash', async () => {
    const payload = await builder.buildContactPayload(SAMPLE_INPUT)
    expect(payload.Data.TelefoneCelular.Ddd).toBe('(11)')
    expect(payload.Data.TelefoneCelular.Numero).toBe('99999-8888')
  })
  it('formats birth date to UTC-3 ISO string', async () => {
    const payload = await builder.buildContactPayload(SAMPLE_INPUT)
    expect(payload.Data.DataNascimento).toBe('1985-03-15T03:00:00.000Z')
  })
  it('builds submit payload with all sections', async () => {
    const payload = await builder.buildSubmitPayload(SAMPLE_INPUT, 'abc123')
    expect(payload.Id).toBe('abc123')
    expect(payload.BrokerId).toBe(1366)
    expect(payload.InsuranceBroker).toBe('lojacorr')
    expect(payload.Type).toBe(0)
    expect(payload.Renovation).toBe(false)
    expect(payload.CalculationAuto).toBeDefined()
    expect(payload.CalculationAuto.Segurado.CpfCnpj).toBe('529.982.247-25')
    expect(payload.CalculationAuto.Veiculo.Modelo).toBe(
      'HB20S COPA MUNDO QATAR 1.0 FLEX MEC.'
    )
    expect(payload.CalculationAuto.Veiculo.CodigoFipe).toBe('015220-0')
    expect(payload.CalculationAuto.Questionario.QuilometragemMensal).toBe(
      '1500'
    )
    expect(payload.CalculationAuto.Seguro.Comissao).toBe('10')
    expect(payload.CalculationAuto.CondutorPrincipal.CpfCnpj).toBe(
      '529.982.247-25'
    )
    expect(payload.CalculationResidence).toBeNull()
    expect(payload.CalculationLife).toBeNull()
  })
  it('maps boolean fields to string 0/1', async () => {
    const payload = await builder.buildSubmitPayload(SAMPLE_INPUT, 'abc123')
    expect(payload.CalculationAuto.Veiculo.ZeroKm).toBe('0')
    expect(payload.CalculationAuto.Veiculo.KitGas).toBe('0')
    expect(payload.CalculationAuto.Veiculo.Blindado).toBe('0')
    expect(payload.CalculationAuto.Veiculo.Alienado).toBe('0')
    expect(payload.CalculationAuto.Questionario.Pcd).toBe('0')
  })
})
