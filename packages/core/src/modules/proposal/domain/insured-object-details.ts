export interface AutoDetails {
  branch: 'AUTO'
  brand: string
  model: string
  manufacturingYear: number
  modelYear: number
  licensePlate?: string
  vin?: string
  color?: string
  fuelType?: string
  vehicleUsage?: string
}

export interface ResidentialDetails {
  branch: 'RESIDENTIAL'
  propertyType: string
  propertyUsage: string
  cep: string
  address?: string
  construction?: string
  areaM2?: number
}

export interface CondominiumDetails {
  branch: 'CONDOMINIUM'
  condominiumName: string
  unitCount: number
  cep: string
  address?: string
  constructionYear?: number
  floorCount?: number
}

export interface BusinessDetails {
  branch: 'BUSINESS'
  legalName: string
  cnpj: string
  businessActivity: string
  cep?: string
  address?: string
  areaM2?: number
}

export interface LifeDetails {
  branch: 'LIFE'
  occupation: string
  monthlyIncomeCents?: number
  isSmoker?: boolean
  extremeSports?: boolean
  heightInCentimeters?: number
  weightInGrams?: number
  beneficiaries?: string
}

export interface OtherDetails {
  branch: 'OTHER'
  description: string
}

export type InsuredObjectDetails =
  | AutoDetails
  | ResidentialDetails
  | CondominiumDetails
  | BusinessDetails
  | LifeDetails
  | OtherDetails

export function isInsuredObjectDetails(
  value: unknown
): value is InsuredObjectDetails {
  if (typeof value !== 'object' || value === null || !('branch' in value))
    return false
  const obj = value as Record<string, unknown>
  const branches = new Set([
    'AUTO',
    'RESIDENTIAL',
    'CONDOMINIUM',
    'BUSINESS',
    'LIFE',
    'OTHER',
  ])
  return typeof obj.branch === 'string' && branches.has(obj.branch)
}
