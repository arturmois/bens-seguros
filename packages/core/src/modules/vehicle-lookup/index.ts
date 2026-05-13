export { LookupVehicleByPlate } from './application/lookup-vehicle-by-plate.js'
export type {
  LookupVehicleByPlateInput,
  LookupVehicleByPlateResult,
} from './application/lookup-vehicle-by-plate.js'
export type { VehicleData, FuelType } from './domain/vehicle-data.js'
export {
  InvalidPlateFormatError,
  LookupProviderUnavailableError,
  PlateNotFoundError,
} from './domain/vehicle-lookup-errors.js'
export type {
  VehicleLookupProvider,
  VehicleLookupInput,
} from './domain/vehicle-lookup-provider.js'
export { ApiBrasilLookupProvider } from './infrastructure/api-brasil-lookup-provider.js'
