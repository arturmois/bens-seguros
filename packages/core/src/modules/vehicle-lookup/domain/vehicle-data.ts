export type FuelType =
  | 'GASOLINE'
  | 'ETHANOL'
  | 'FLEX'
  | 'DIESEL'
  | 'ELECTRIC'
  | 'HYBRID'
  | 'OTHER'

export interface VehicleData {
  readonly brand: string
  readonly model: string
  readonly manufacturingYear: number
  readonly modelYear: number
  readonly color: string | null
  readonly fuelType: FuelType | null
  readonly chassi: string | null
  readonly plate: string | null
}
