export type Gender = 'MALE' | 'FEMALE'

export type MaritalStatus =
  | 'MARRIED'
  | 'DIVORCED'
  | 'SEPARATED'
  | 'SINGLE'
  | 'WIDOWED'

export type FuelType =
  | 'FLEX'
  | 'GASOLINE'
  | 'ALCOHOL'
  | 'DIESEL'
  | 'HYBRID'
  | 'TETRAFUEL'
  | 'ELECTRIC'

export type ResidenceType = 'HOUSE' | 'APARTMENT' | 'CONDOMINIUM' | 'OTHER'

export type ResidenceGarageType =
  | 'ELECTRONIC_GATE'
  | 'MANUAL_GATE'
  | 'NO_GARAGE'

export type WorkGarageType = 'NOT_APPLICABLE' | 'NO' | 'YES' | 'NOT_WORKING'

export type StudyGarageType = 'NOT_APPLICABLE' | 'NO' | 'YES' | 'NOT_STUDENT'

export type VehicleUsage = 'PERSONAL' | 'PROFESSIONAL' | 'TAXI' | 'APP_DRIVER'

export type InsuranceType = 'NEW' | 'RENEWAL'

export type DriverRelationship =
  | 'SELF'
  | 'SPOUSE'
  | 'EMPLOYEE'
  | 'SIBLING'
  | 'CHILD'
  | 'MOTHER'
  | 'FATHER'
  | 'OTHER'

export type TrackerType =
  | 'NONE'
  | 'AUTOTRAC'
  | 'CAR_SYSTEM'
  | 'CELTEC'
  | 'CIELO'
  | 'GRABER'
  | 'ITURAN'
  | 'TRACKER'
  | 'OMNILINK'
  | 'POSITRON'
  | 'SASCAR'
  | 'DAF_V'
  | 'CEABS'
  | 'ONSTAR'
  | 'LO_JACK'
  | 'FACTORY_ORIGINAL'
  | 'SEGSAT'
  | 'SAT_COMPANY'

export type AntitheftType =
  | 'NONE'
  | 'ALARM'
  | 'IGNITION_BLOCKER'
  | 'CARNEIRO_LOCK'
  | 'MULT_LOCK'
  | 'OTHER'

export type BooleanOption = 'YES' | 'NO'

export interface EnumOption {
  key: string
  value: string
}
