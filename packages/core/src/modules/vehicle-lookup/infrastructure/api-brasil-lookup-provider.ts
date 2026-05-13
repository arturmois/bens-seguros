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

const ENDPOINT = 'https://gateway.apibrasil.io/api/v2/vehicles/dados'
const TIMEOUT_MS = 3000

const logger = pino({ name: 'vehicle-lookup' })

const apiBrasilResponseSchema = z
  .object({
    error: z.boolean().optional(),
    message: z.string().optional(),
    response: z
      .object({
        marca: z.string().optional(),
        modelo: z.string().optional(),
        ano: z.union([z.string(), z.number()]).optional(),
        anoModelo: z.union([z.string(), z.number()]).optional(),
        cor: z.string().optional(),
        combustivel: z.string().optional(),
        chassi: z.string().optional(),
        placa: z.string().optional(),
      })
      .optional(),
  })
  .passthrough()

type ApiBrasilResponse = z.infer<typeof apiBrasilResponseSchema>

@injectable()
export class ApiBrasilLookupProvider implements VehicleLookupProvider {
  async lookup(input: VehicleLookupInput): Promise<VehicleData> {
    if (!env.APIBRASIL_DEVICE_TOKEN || !env.APIBRASIL_BEARER_TOKEN) {
      logger.warn('APIBrasil credentials not configured')
      throw new LookupProviderUnavailableError()
    }

    const body = input.plate ? { placa: input.plate } : { chassi: input.chassi }

    const controller = new AbortController()
    const timer = setTimeout(() => {
      controller.abort()
    }, TIMEOUT_MS)

    let res: Response
    try {
      res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          DeviceToken: env.APIBRASIL_DEVICE_TOKEN,
          Authorization: `Bearer ${env.APIBRASIL_BEARER_TOKEN}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
    } catch (err) {
      logger.warn({ err }, 'APIBrasil request failed (network/timeout)')
      throw new LookupProviderUnavailableError()
    } finally {
      clearTimeout(timer)
    }

    if (res.status === 401 || res.status === 403) {
      logger.error(
        { status: res.status },
        'APIBrasil auth failed — check credentials'
      )
      throw new LookupProviderUnavailableError()
    }
    if (res.status === 404) {
      throw new PlateNotFoundError()
    }
    if (res.status >= 500) {
      logger.warn({ status: res.status }, 'APIBrasil returned 5xx')
      throw new LookupProviderUnavailableError()
    }
    if (!res.ok) {
      logger.warn({ status: res.status }, 'APIBrasil returned non-ok status')
      throw new LookupProviderUnavailableError()
    }

    const rawBody: unknown = await res.json()
    const parsed = apiBrasilResponseSchema.safeParse(rawBody)
    if (!parsed.success) {
      logger.warn({ issues: parsed.error.issues }, 'APIBrasil unexpected shape')
      throw new LookupProviderUnavailableError()
    }

    const json: ApiBrasilResponse = parsed.data
    if (json.error === true || !json.response) {
      const msg = (json.message ?? '').toLowerCase()
      if (msg.includes('não encontrad') || msg.includes('nao encontrad')) {
        throw new PlateNotFoundError()
      }
      throw new LookupProviderUnavailableError()
    }

    return this.toVehicleData(json.response, input)
  }

  private toVehicleData(
    raw: NonNullable<ApiBrasilResponse['response']>,
    input: VehicleLookupInput
  ): VehicleData {
    return {
      brand: (raw.marca ?? '').toUpperCase(),
      model: (raw.modelo ?? '').toUpperCase(),
      manufacturingYear: this.toYear(raw.ano),
      modelYear: this.toYear(raw.anoModelo ?? raw.ano),
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
    const upper = raw.toUpperCase()
    if (upper.includes('FLEX')) return 'FLEX'
    if (upper.includes('GASOLINA')) return 'GASOLINE'
    if (upper.includes('ETANOL') || upper.includes('ALCOOL')) return 'ETHANOL'
    if (upper.includes('DIESEL')) return 'DIESEL'
    if (upper.includes('ELETR')) return 'ELECTRIC'
    if (upper.includes('HIBRID')) return 'HYBRID'
    return 'OTHER'
  }
}
