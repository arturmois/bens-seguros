import type { VehicleData } from './vehicle-data.js'

export interface VehicleLookupInput {
  readonly plate?: string
  readonly chassi?: string
}

export interface VehicleLookupProvider {
  lookup(input: VehicleLookupInput): Promise<VehicleData>
}
