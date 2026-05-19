import { z } from 'zod'

import type { InsuranceBranch } from './constants'

const premiumCommissionFields = {
  premiumValueInCents: z
    .number({ message: 'Valor do prêmio é obrigatório' })
    .min(0, 'Valor do prêmio não pode ser negativo'),
  commissionBasisPoints: z
    .number({ message: 'Comissão é obrigatória' })
    .min(0, 'Comissão não pode ser negativa')
    .max(10000, 'Comissão não pode passar de 100%'),
}

const optionalString = z
  .union([z.string(), z.literal(''), z.undefined(), z.null()])
  .optional()

const optionalNumber = z
  .union([z.number(), z.nan(), z.undefined(), z.null()])
  .optional()

const optionalBoolean = z
  .union([z.boolean(), z.undefined(), z.null()])
  .optional()

export const autoFormSchema = z.object({
  vehicle: z
    .string({ message: 'Veículo é obrigatório' })
    .min(1, 'Veículo é obrigatório')
    .max(100, 'Veículo deve ter no máximo 100 caracteres'),
  manufacturingYear: z
    .number({ message: 'Ano de fabricação é obrigatório' })
    .int('Ano de fabricação deve ser inteiro')
    .min(1900, 'Ano mínimo: 1900')
    .max(2100, 'Ano máximo: 2100'),
  modelYear: z
    .number({ message: 'Ano modelo é obrigatório' })
    .int('Ano modelo deve ser inteiro')
    .min(1900, 'Ano mínimo: 1900')
    .max(2100, 'Ano máximo: 2100'),
  licensePlate: optionalString,
  vin: optionalString,
  color: optionalString,
  fuelType: optionalString,
  vehicleUsage: optionalString,
  ...premiumCommissionFields,
})

export const residentialFormSchema = z.object({
  propertyType: z
    .string({ message: 'Tipo do imóvel é obrigatório' })
    .min(1, 'Tipo do imóvel é obrigatório'),
  propertyUsage: z
    .string({ message: 'Uso do imóvel é obrigatório' })
    .min(1, 'Uso do imóvel é obrigatório'),
  cep: z.string({ message: 'CEP é obrigatório' }).min(1, 'CEP é obrigatório'),
  street: optionalString,
  number: optionalString,
  complement: optionalString,
  neighborhood: optionalString,
  city: optionalString,
  state: z
    .union([
      z.string().length(2, 'UF deve ter 2 letras'),
      z.literal(''),
      z.undefined(),
      z.null(),
    ])
    .optional(),
  construction: optionalString,
  areaM2: optionalNumber,
  ...premiumCommissionFields,
})

export const condominiumFormSchema = z.object({
  condominiumName: z
    .string({ message: 'Nome do condomínio é obrigatório' })
    .min(1, 'Nome do condomínio é obrigatório'),
  unitCount: z
    .number({ message: 'Quantidade de unidades é obrigatória' })
    .int('Unidades deve ser inteiro')
    .min(1, 'Mínimo de 1 unidade'),
  cep: z.string({ message: 'CEP é obrigatório' }).min(1, 'CEP é obrigatório'),
  street: optionalString,
  number: optionalString,
  complement: optionalString,
  neighborhood: optionalString,
  city: optionalString,
  state: z
    .union([
      z.string().length(2, 'UF deve ter 2 letras'),
      z.literal(''),
      z.undefined(),
      z.null(),
    ])
    .optional(),
  constructionYear: optionalNumber,
  floorCount: optionalNumber,
  blockCount: optionalNumber,
  elevatorCount: optionalNumber,
  employeeCount: optionalNumber,
  hasSecurityEquipment: optionalBoolean,
  securityEquipmentDetails: optionalString,
  hasFireEquipment: optionalBoolean,
  fireEquipmentDetails: optionalString,
  ...premiumCommissionFields,
})

export const businessFormSchema = z.object({
  legalName: z
    .string({ message: 'Razão social é obrigatória' })
    .min(1, 'Razão social é obrigatória'),
  cnpj: z
    .string({ message: 'CNPJ é obrigatório' })
    .min(1, 'CNPJ é obrigatório'),
  businessActivity: z
    .string({ message: 'Atividade é obrigatória' })
    .min(1, 'Atividade é obrigatória'),
  cep: optionalString,
  street: optionalString,
  number: optionalString,
  complement: optionalString,
  neighborhood: optionalString,
  city: optionalString,
  state: z
    .union([
      z.string().length(2, 'UF deve ter 2 letras'),
      z.literal(''),
      z.undefined(),
      z.null(),
    ])
    .optional(),
  areaM2: optionalNumber,
  ...premiumCommissionFields,
})

export const lifeFormSchema = z.object({
  occupation: z
    .string({ message: 'Ocupação é obrigatória' })
    .min(1, 'Ocupação é obrigatória'),
  monthlyIncomeCents: optionalNumber,
  isSmoker: optionalBoolean,
  extremeSports: optionalBoolean,
  heightInCentimeters: z
    .union([
      z
        .number()
        .min(100, 'Altura mínima: 100cm')
        .max(250, 'Altura máxima: 250cm'),
      z.nan(),
      z.undefined(),
      z.null(),
    ])
    .optional(),
  weightKg: z
    .union([
      z.number().min(20, 'Peso mínimo: 20kg').max(300, 'Peso máximo: 300kg'),
      z.nan(),
      z.undefined(),
      z.null(),
    ])
    .optional(),
  beneficiaries: optionalString,
  ...premiumCommissionFields,
})

export const otherFormSchema = z.object({
  description: z
    .string({ message: 'Descrição é obrigatória' })
    .min(1, 'Descrição é obrigatória'),
  ...premiumCommissionFields,
})

export function getFormSchemaFor(branch: InsuranceBranch): z.ZodType {
  switch (branch) {
    case 'AUTO':
      return autoFormSchema
    case 'RESIDENTIAL':
      return residentialFormSchema
    case 'CONDOMINIUM':
      return condominiumFormSchema
    case 'BUSINESS':
      return businessFormSchema
    case 'LIFE':
      return lifeFormSchema
    case 'OTHER':
      return otherFormSchema
  }
}
