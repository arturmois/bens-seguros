export type { AddressData } from './domain/address-data.js'
export type { CepLookupProvider } from './domain/cep-lookup-provider.js'
export {
  CepNotFoundError,
  CepProviderUnavailableError,
  InvalidCepError,
} from './domain/errors.js'
export { LookupCep } from './application/lookup-cep.js'
export { ViaCepProvider } from './infrastructure/viacep-provider.js'
