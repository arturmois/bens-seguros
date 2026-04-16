import type {
  Gender,
  MaritalStatus,
  FuelType,
  ResidenceType,
  ResidenceGarageType,
  WorkGarageType,
  StudyGarageType,
  VehicleUsage,
  InsuranceType,
  DriverRelationship,
  TrackerType,
  AntitheftType,
  BooleanOption,
} from '../types/enums.js'

export const GENDER_MAP: Record<Gender, string> = {
  MALE: '1',
  FEMALE: '2',
} as const

export const MARITAL_STATUS_MAP: Record<MaritalStatus, string> = {
  MARRIED: '1',
  DIVORCED: '2',
  SEPARATED: '3',
  SINGLE: '4',
  WIDOWED: '5',
} as const

export const FUEL_TYPE_MAP: Record<FuelType, string> = {
  FLEX: '1',
  GASOLINE: '2',
  ALCOHOL: '3',
  DIESEL: '4',
  HYBRID: '5',
  TETRAFUEL: '6',
  ELECTRIC: '7',
} as const

export const RESIDENCE_TYPE_MAP: Record<ResidenceType, string> = {
  HOUSE: '1',
  APARTMENT: '2',
  CONDOMINIUM: '3',
  OTHER: '4',
} as const

export const RESIDENCE_GARAGE_MAP: Record<ResidenceGarageType, string> = {
  ELECTRONIC_GATE: '1',
  MANUAL_GATE: '2',
  NO_GARAGE: '3',
} as const

export const WORK_GARAGE_MAP: Record<WorkGarageType, string> = {
  NOT_APPLICABLE: '0',
  NO: '1',
  YES: '2',
  NOT_WORKING: '3',
} as const

export const STUDY_GARAGE_MAP: Record<StudyGarageType, string> = {
  NOT_APPLICABLE: '0',
  NO: '1',
  YES: '2',
  NOT_STUDENT: '3',
} as const

export const VEHICLE_USAGE_MAP: Record<VehicleUsage, string> = {
  PERSONAL: '0',
  PROFESSIONAL: '1',
  TAXI: '2',
  APP_DRIVER: '3',
} as const

export const INSURANCE_TYPE_MAP: Record<InsuranceType, string> = {
  NEW: '0',
  RENEWAL: '1',
} as const

export const DRIVER_RELATIONSHIP_MAP: Record<DriverRelationship, string> = {
  SELF: '0',
  SPOUSE: '2',
  EMPLOYEE: '3',
  SIBLING: '4',
  CHILD: '5',
  MOTHER: '6',
  FATHER: '7',
  OTHER: '8',
} as const

export const TRACKER_MAP: Record<TrackerType, string> = {
  NONE: '0',
  AUTOTRAC: '1',
  CAR_SYSTEM: '2',
  CELTEC: '3',
  CIELO: '4',
  GRABER: '5',
  ITURAN: '6',
  TRACKER: '7',
  OMNILINK: '8',
  POSITRON: '9',
  SASCAR: '10',
  DAF_V: '11',
  CEABS: '12',
  ONSTAR: '13',
  LO_JACK: '14',
  FACTORY_ORIGINAL: '15',
  SEGSAT: '16',
  SAT_COMPANY: '17',
} as const

export const ANTITHEFT_MAP: Record<AntitheftType, string> = {
  NONE: '0',
  ALARM: '1',
  IGNITION_BLOCKER: '2',
  CARNEIRO_LOCK: '3',
  MULT_LOCK: '4',
  OTHER: '5',
} as const

export const BOOLEAN_MAP: Record<BooleanOption, string> = {
  NO: '0',
  YES: '1',
} as const

export const ALL_ENUM_DEFAULTS = {
  Sexo: GENDER_MAP,
  EstadoCivil: MARITAL_STATUS_MAP,
  Combustivel: FUEL_TYPE_MAP,
  TipoResidencia: RESIDENCE_TYPE_MAP,
  GaragemResidencia: RESIDENCE_GARAGE_MAP,
  GaragemTrabalho: WORK_GARAGE_MAP,
  GaragemEstudo: STUDY_GARAGE_MAP,
  UsoVeiculo: VEHICLE_USAGE_MAP,
  TipoSeguro: INSURANCE_TYPE_MAP,
  RelacaoSeguradoCondutor: DRIVER_RELATIONSHIP_MAP,
  Rastreador: TRACKER_MAP,
  Antifurto: ANTITHEFT_MAP,
} as const
