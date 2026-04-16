import type {
  FuelType,
  TrackerType,
  AntitheftType,
  ResidenceType,
  ResidenceGarageType,
  WorkGarageType,
  StudyGarageType,
  VehicleUsage,
  InsuranceType,
  DriverRelationship,
  Gender,
  MaritalStatus,
} from './enums.js'
import type { InsuredPersonInput } from './common.js'

export interface VehicleInput {
  licensePlate?: string
  model: string
  manufacturer: string
  manufactureYear: number
  modelYear: number
  fipeCode: string
  isZeroKm: boolean
  fuelType: FuelType
  overnightCep: string
  tracker: TrackerType
  antitheft: AntitheftType
  isFinanced: boolean
  hasGasKit: boolean
  isArmored: boolean
  chassisNumber?: string
}

export interface QuestionnaireInput {
  residenceType: ResidenceType
  residenceGarage: ResidenceGarageType
  workGarage: WorkGarageType
  studyGarage: StudyGarageType
  vehicleUsage: VehicleUsage
  monthlyMileage: number
  isPcd: boolean
  livesWithUnder26: boolean
  profession?: string
  workDistance?: string
  usagePeriod?: string
}

export interface InsuranceInput {
  type: InsuranceType
  startDate: string
  endDate: string
  commission: number
  bonus?: string
  previousInsurer?: string
  previousPolicyNumber?: string
  hasClaims?: boolean
  observations?: string
}

export interface MainDriverInput {
  cpf: string
  fullName: string
  birthDate: string
  gender: Gender
  maritalStatus: MaritalStatus
  licenseYears?: number
  relationship: DriverRelationship
}

export interface AutoQuoteInput {
  brokerId: number
  insuranceBroker: string
  insured: InsuredPersonInput
  vehicle: VehicleInput
  questionnaire: QuestionnaireInput
  insurance: InsuranceInput
  mainDriver: MainDriverInput
}

export interface FipeModel {
  model: string
  manufacturer: string
  fipeCode: string
  vehicleType: number
}

export interface FipeSearchInput {
  model: string
  year: number
}
