import type { Gender, MaritalStatus } from './enums.js'

export interface PhoneInput {
  areaCode: string
  number: string
}

export interface InsuredPersonInput {
  cpf: string
  fullName: string
  birthDate: string
  gender: Gender
  maritalStatus: MaritalStatus
  cep: string
  email: string
  cellPhone: PhoneInput | null
  homePhone: PhoneInput | null
}

export interface ClientConfig {
  baseUrl?: string
  fipeBaseUrl?: string
}

export interface QuoteResult {
  id: string
}
