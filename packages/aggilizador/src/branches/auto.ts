import { autoQuoteInputSchema } from '../schemas.js'
import { request } from '../http.js'
import {
  AggilizadorBusinessError,
  AggilizadorValidationError,
} from '../errors.js'
import type { AutoPayloadBuilder } from '../builders/auto-payload-builder.js'
import type { EnumRegistry } from '../mappings/enum-registry.js'
import type { ApiContactResponse } from '../types/api.js'
import type { AutoQuoteInput } from '../types/auto.js'
import type { QuoteResult } from '../types/common.js'
import type { EnumOption } from '../types/enums.js'

const ENUM_FIELDS = [
  ['gender', 'Sexo'],
  ['maritalStatus', 'EstadoCivil'],
  ['fuelType', 'Combustivel'],
  ['residenceType', 'TipoResidencia'],
  ['residenceGarage', 'GaragemResidencia'],
  ['workGarage', 'GaragemTrabalho'],
  ['studyGarage', 'GaragemEstudo'],
  ['vehicleUsage', 'UsoVeiculo'],
  ['insuranceType', 'TipoSeguro'],
  ['tracker', 'Rastreador'],
  ['antitheft', 'Antifurto'],
  ['previousInsurer', 'SeguradoraAnterior'],
  ['bonus', 'Bonus'],
  ['bank', 'Banco'],
  ['licenseYears', 'TempoHabilitacao'],
  ['driverRelationship', 'RelacaoSeguradoCondutor'],
] as const

export class AutoQuoteService {
  constructor(
    private readonly baseUrl: string,
    private readonly builder: AutoPayloadBuilder,
    private readonly registry: EnumRegistry
  ) {}

  async submitQuote(input: AutoQuoteInput): Promise<QuoteResult> {
    this.validate(input)
    const contactPayload = await this.builder.buildContactPayload(input)
    const contactResult = await request<ApiContactResponse>({
      method: 'POST',
      url: `${this.baseUrl}/Auto/Contact`,
      body: contactPayload,
    })
    if (contactResult.ErrorMessages.length > 0) {
      throw new AggilizadorBusinessError(
        `Contact rejected: ${contactResult.ErrorMessages.join(', ')}`,
        contactResult.ErrorMessages
      )
    }
    const submitPayload = await this.builder.buildSubmitPayload(
      input,
      contactResult.Id
    )
    await request<unknown>({
      method: 'POST',
      url: `${this.baseUrl}/Auto`,
      body: submitPayload,
    })
    return { id: contactResult.Id }
  }

  async getEnums(): Promise<Record<string, readonly EnumOption[]>> {
    const entries = await Promise.all(
      ENUM_FIELDS.map(async ([key, apiField]) => {
        const options = await this.registry.getEnumList(apiField)
        return [key, options] as const
      })
    )
    return Object.fromEntries(entries)
  }

  private validate(input: AutoQuoteInput): void {
    const result = autoQuoteInputSchema.safeParse(input)
    if (result.success) {
      return
    }
    const fieldErrors: Record<string, string[]> = {}
    for (const issue of result.error.issues) {
      const path = issue.path.join('.')
      const existing = fieldErrors[path]
      if (existing) {
        existing.push(issue.message)
      } else {
        fieldErrors[path] = [issue.message]
      }
    }
    const fieldNames = Object.keys(fieldErrors).join(', ')
    throw new AggilizadorValidationError(
      `Invalid input fields: ${fieldNames}`,
      fieldErrors
    )
  }
}
