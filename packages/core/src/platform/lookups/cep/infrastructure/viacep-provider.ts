import { injectable } from 'tsyringe'
import type { AddressData } from '../domain/address-data.js'
import type { CepLookupProvider } from '../domain/cep-lookup-provider.js'
import { CepProviderUnavailableError } from '../domain/errors.js'

interface ViaCepResponse {
  cep?: string
  logradouro?: string
  complemento?: string
  bairro?: string
  localidade?: string
  uf?: string
  erro?: boolean
}

const VIACEP_URL = 'https://viacep.com.br/ws'
const TIMEOUT_MS = 5000

function isViaCepResponse(value: unknown): value is ViaCepResponse {
  return typeof value === 'object' && value !== null
}

@injectable()
export class ViaCepProvider implements CepLookupProvider {
  async lookup(cep: string): Promise<AddressData | null> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, TIMEOUT_MS)
    try {
      const response = await fetch(`${VIACEP_URL}/${cep}/json/`, {
        signal: controller.signal,
      })
      if (!response.ok) {
        throw new CepProviderUnavailableError()
      }
      const rawBody: unknown = await response.json()
      if (!isViaCepResponse(rawBody)) {
        throw new CepProviderUnavailableError()
      }
      if (rawBody.erro) {
        return null
      }
      if (typeof rawBody.uf !== 'string' || rawBody.uf.length !== 2) {
        throw new CepProviderUnavailableError()
      }
      const complement = rawBody.complemento
      return {
        zipCode: cep,
        street: rawBody.logradouro ?? '',
        neighborhood: rawBody.bairro ?? '',
        city: rawBody.localidade ?? '',
        state: rawBody.uf,
        complement:
          typeof complement === 'string' && complement.length > 0
            ? complement
            : null,
      }
    } catch (error) {
      if (error instanceof CepProviderUnavailableError) {
        throw error
      }
      throw new CepProviderUnavailableError()
    } finally {
      clearTimeout(timeoutId)
    }
  }
}
