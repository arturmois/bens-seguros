import type { AddressData } from './address-data.js'

export interface CepLookupProvider {
  lookup(cep: string): Promise<AddressData | null>
}
