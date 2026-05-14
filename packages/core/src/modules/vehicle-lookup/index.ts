export { LookupVehicleByPlate } from './application/lookup-vehicle-by-plate.js'
export type {
  LookupVehicleByPlateInput,
  LookupVehicleByPlateResult,
} from './application/lookup-vehicle-by-plate.js'
export type { FuelType, VehicleData } from './domain/vehicle-data.js'
export {
  InvalidPlateFormatError,
  LookupProviderUnavailableError,
  PlateNotFoundError,
} from './domain/vehicle-lookup-errors.js'
export type {
  VehicleLookupInput,
  VehicleLookupProvider,
} from './domain/vehicle-lookup-provider.js'
export { LookupProviderConsultarPlaca } from './infrastructure/lookup-provider-consultar-placa.js'
