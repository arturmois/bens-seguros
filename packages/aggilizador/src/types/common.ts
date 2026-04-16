export interface PhoneInput {
  areaCode: string
  number: string
}

export interface InsuredPersonInput {
  cpf: string
  fullName: string
  birthDate: string
  gender: import('./enums.js').Gender
  maritalStatus: import('./enums.js').MaritalStatus
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
