export { AggilizadorClient } from './client.js'
export { AutoQuoteService } from './branches/auto.js'
export { FipeClient } from './fipe/fipe-client.js'

export {
  AggilizadorApiError,
  AggilizadorBusinessError,
  AggilizadorError,
  AggilizadorValidationError,
} from './errors.js'

export type { ClientConfig, QuoteResult } from './types/common.js'
export type { InsuredPersonInput, PhoneInput } from './types/common.js'
export type {
  AutoQuoteInput,
  FipeModel,
  FipeSearchInput,
  InsuranceInput,
  MainDriverInput,
  QuestionnaireInput,
  VehicleInput,
} from './types/auto.js'
export type {
  AntitheftType,
  BooleanOption,
  DriverRelationship,
  EnumOption,
  FuelType,
  Gender,
  InsuranceType,
  MaritalStatus,
  ResidenceGarageType,
  ResidenceType,
  StudyGarageType,
  TrackerType,
  VehicleUsage,
  WorkGarageType,
} from './types/enums.js'
