import type { AddressData } from './address-data.js'

export interface CepLookupProvider {
  // Returns null when the CEP is well-formed but not present in the provider.
  // Throws CepProviderUnavailableError for timeouts, network errors, or
  // unparseable responses — i.e. conditions the caller can retry later.
  lookup(cep: string): Promise<AddressData | null>
}
