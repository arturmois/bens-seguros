import { env } from '@repo/env'
import pino from 'pino'
import { injectable } from 'tsyringe'
import { z } from 'zod'
import type { FuelType, VehicleData } from '../domain/vehicle-data.js'
import {
  LookupProviderUnavailableError,
  PlateNotFoundError,
} from '../domain/vehicle-lookup-errors.js'
import type {
  VehicleLookupInput,
  VehicleLookupProvider,
} from '../domain/vehicle-lookup-provider.js'

const ENDPOINT = 'https://api.consultarplaca.com.br/v2/consultarPlaca'
const TIMEOUT_MS = 3000
const PROVIDER_NAME = 'consultar-placa'

const logger = pino({ name: 'vehicle-lookup' })

const dadosVeiculoSchema = z
  .object({
    placa: z.string().optional(),
    chassi: z.string().optional(),
    ano_fabricacao: z.union([z.string(), z.number()]).optional(),
    ano_modelo: z.union([z.string(), z.number()]).optional(),
    marca: z.string().optional(),
    modelo: z.string().optional(),
    cor: z.string().optional(),
    combustivel: z.string().optional(),
  })
  .passthrough()

const consultarPlacaResponseSchema = z
  .object({
    status: z.string().optional(),
    tipo_do_erro: z.string().optional(),
    mensagem: z.string().optional(),
    dados: z
      .object({
        informacoes_veiculo: z
          .object({
            dados_veiculo: dadosVeiculoSchema.optional(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough()

type ConsultarPlacaResponse = z.infer<typeof consultarPlacaResponseSchema>

@injectable()
export class LookupProviderConsultarPlaca implements VehicleLookupProvider {
  readonly name = PROVIDER_NAME

  async lookup(input: VehicleLookupInput): Promise<VehicleData> {
    if (!env.CONSULTAR_PLACA_EMAIL || !env.CONSULTAR_PLACA_API_KEY) {
      logger.warn('Consultar Placa credentials not configured')
      throw new LookupProviderUnavailableError()
    }

    if (!input.plate) {
      logger.info(
        'Consultar Placa requires plate; chassi-only lookup unsupported'
      )
      throw new PlateNotFoundError()
    }

    const url = new URL(ENDPOINT)
    url.searchParams.set('placa', input.plate)

    const credentials = Buffer.from(
      `${env.CONSULTAR_PLACA_EMAIL}:${env.CONSULTAR_PLACA_API_KEY}`
    ).toString('base64')

    const controller = new AbortController()
    const timer = setTimeout(() => {
      controller.abort()
    }, TIMEOUT_MS)

    let res: Response
    try {
      res = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Basic ${credentials}`,
          Accept: 'application/json',
        },
        signal: controller.signal,
      })
    } catch (err) {
      logger.warn({ err }, 'Consultar Placa request failed (network/timeout)')
      throw new LookupProviderUnavailableError()
    } finally {
      clearTimeout(timer)
    }

    if (res.status === 401 || res.status === 403) {
      logger.error(
        { status: res.status },
        'Consultar Placa auth failed — check credentials'
      )
      throw new LookupProviderUnavailableError()
    }
    if (res.status === 404) {
      throw new PlateNotFoundError()
    }
    if (res.status === 402) {
      logger.error('Consultar Placa returned 402 — credit balance exhausted')
      throw new LookupProviderUnavailableError()
    }
    if (res.status >= 500) {
      logger.warn({ status: res.status }, 'Consultar Placa returned 5xx')
      throw new LookupProviderUnavailableError()
    }

    const rawBody: unknown = await res.json()
    const parsed = consultarPlacaResponseSchema.safeParse(rawBody)
    if (!parsed.success) {
      logger.warn(
        { issues: parsed.error.issues },
        'Consultar Placa unexpected response shape'
      )
      throw new LookupProviderUnavailableError()
    }

    const json: ConsultarPlacaResponse = parsed.data

    if (json.status === 'erro') {
      if (json.tipo_do_erro === 'credito_insuficiente') {
        logger.error('Consultar Placa returned credito_insuficiente')
        throw new LookupProviderUnavailableError()
      }
      const msg = (json.mensagem ?? '').toLowerCase()
      if (msg.includes('não encontrad') || msg.includes('nao encontrad')) {
        throw new PlateNotFoundError()
      }
      logger.warn({ json }, 'Consultar Placa returned unknown error')
      throw new LookupProviderUnavailableError()
    }

    const dadosVeiculo = json.dados?.informacoes_veiculo?.dados_veiculo
    if (!dadosVeiculo) {
      logger.warn({ json }, 'Consultar Placa response missing dados_veiculo')
      throw new PlateNotFoundError()
    }

    return this.toVehicleData(dadosVeiculo, input)
  }

  private toVehicleData(
    raw: z.infer<typeof dadosVeiculoSchema>,
    input: VehicleLookupInput
  ): VehicleData {
    const brand = (raw.marca ?? '').toUpperCase()
    const model = (raw.modelo ?? '').toUpperCase()
    return {
      vehicle: `${brand} ${model}`.replace(/\s+/g, ' ').trim(),
      manufacturingYear: this.toYear(raw.ano_fabricacao),
      modelYear: this.toYear(raw.ano_modelo ?? raw.ano_fabricacao),
      color: raw.cor ? raw.cor.toUpperCase() : null,
      fuelType: this.toFuelType(raw.combustivel),
      chassi: raw.chassi ?? null,
      plate: raw.placa ?? input.plate ?? null,
    }
  }

  private toYear(value: string | number | undefined): number {
    if (typeof value === 'number') return value
    if (typeof value === 'string') {
      const n = Number.parseInt(value, 10)
      if (!Number.isNaN(n)) return n
    }
    return 0
  }

  private toFuelType(raw: string | undefined): FuelType | null {
    if (!raw) return null
    const upper = raw
      .toUpperCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
    const hasGasoline = upper.includes('GASOLINA')
    const hasEthanol = upper.includes('ETANOL') || upper.includes('ALCOOL')
    if (upper.includes('FLEX') || (hasGasoline && hasEthanol)) return 'FLEX'
    if (hasGasoline) return 'GASOLINE'
    if (hasEthanol) return 'ETHANOL'
    if (upper.includes('DIESEL')) return 'DIESEL'
    if (upper.includes('ELETR')) return 'ELECTRIC'
    if (upper.includes('HIBRID')) return 'HYBRID'
    return 'OTHER'
  }
}
