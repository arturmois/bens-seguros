import type { InsuranceBranch, InsuredObjectDetails } from './constants'
import type { AutoFillData } from '../components/branch-field-sets-property'

export function buildDetails(
  branch: InsuranceBranch,
  fields: Record<string, unknown>
): InsuredObjectDetails {
  switch (branch) {
    case 'AUTO':
      return {
        branch,
        vehicle: String(fields.vehicle ?? '').trim(),
        manufacturingYear: Number(fields.manufacturingYear) || 0,
        modelYear: Number(fields.modelYear) || 0,
        licensePlate: fields.licensePlate
          ? String(fields.licensePlate)
          : undefined,
        vin: fields.vin ? String(fields.vin) : undefined,
        color: fields.color ? String(fields.color) : undefined,
        fuelType: fields.fuelType ? String(fields.fuelType) : undefined,
        vehicleUsage: fields.vehicleUsage
          ? String(fields.vehicleUsage)
          : undefined,
      }
    case 'RESIDENTIAL':
      return {
        branch,
        propertyType: String(fields.propertyType ?? ''),
        propertyUsage: String(fields.propertyUsage ?? ''),
        cep: String(fields.cep ?? ''),
        street: fields.street ? String(fields.street) : undefined,
        number: fields.number ? String(fields.number) : undefined,
        complement: fields.complement ? String(fields.complement) : undefined,
        neighborhood: fields.neighborhood
          ? String(fields.neighborhood)
          : undefined,
        city: fields.city ? String(fields.city) : undefined,
        state: fields.state ? String(fields.state) : undefined,
        construction: fields.construction
          ? String(fields.construction)
          : undefined,
        areaM2: fields.areaM2 ? Number(fields.areaM2) : undefined,
      }
    case 'CONDOMINIUM':
      return {
        branch,
        condominiumName: String(fields.condominiumName ?? ''),
        unitCount: Number(fields.unitCount) || 0,
        cep: String(fields.cep ?? ''),
        street: fields.street ? String(fields.street) : undefined,
        number: fields.number ? String(fields.number) : undefined,
        complement: fields.complement ? String(fields.complement) : undefined,
        neighborhood: fields.neighborhood
          ? String(fields.neighborhood)
          : undefined,
        city: fields.city ? String(fields.city) : undefined,
        state: fields.state ? String(fields.state) : undefined,
        constructionYear: fields.constructionYear
          ? Number(fields.constructionYear)
          : undefined,
        floorCount: fields.floorCount ? Number(fields.floorCount) : undefined,
        blockCount: fields.blockCount ? Number(fields.blockCount) : undefined,
        elevatorCount: fields.elevatorCount
          ? Number(fields.elevatorCount)
          : undefined,
        employeeCount: fields.employeeCount
          ? Number(fields.employeeCount)
          : undefined,
        hasSecurityEquipment:
          typeof fields.hasSecurityEquipment === 'boolean'
            ? fields.hasSecurityEquipment
            : undefined,
        securityEquipmentDetails: fields.securityEquipmentDetails
          ? String(fields.securityEquipmentDetails)
          : undefined,
        hasFireEquipment:
          typeof fields.hasFireEquipment === 'boolean'
            ? fields.hasFireEquipment
            : undefined,
        fireEquipmentDetails: fields.fireEquipmentDetails
          ? String(fields.fireEquipmentDetails)
          : undefined,
      }
    case 'BUSINESS':
      return {
        branch,
        legalName: String(fields.legalName ?? ''),
        cnpj: String(fields.cnpj ?? ''),
        businessActivity: String(fields.businessActivity ?? ''),
        cep: fields.cep ? String(fields.cep) : undefined,
        street: fields.street ? String(fields.street) : undefined,
        number: fields.number ? String(fields.number) : undefined,
        complement: fields.complement ? String(fields.complement) : undefined,
        neighborhood: fields.neighborhood
          ? String(fields.neighborhood)
          : undefined,
        city: fields.city ? String(fields.city) : undefined,
        state: fields.state ? String(fields.state) : undefined,
        areaM2: fields.areaM2 ? Number(fields.areaM2) : undefined,
      }
    case 'LIFE':
      return {
        branch,
        occupation: String(fields.occupation ?? ''),
        monthlyIncomeCents: fields.monthlyIncomeCents
          ? Number(fields.monthlyIncomeCents)
          : undefined,
        isSmoker: fields.isSmoker === true ? true : undefined,
        extremeSports: fields.extremeSports === true ? true : undefined,
        heightInCentimeters: fields.heightInCentimeters
          ? Number(fields.heightInCentimeters)
          : undefined,
        weightInGrams: fields.weightKg
          ? Math.round(Number(fields.weightKg) * 1000)
          : undefined,
        beneficiaries: fields.beneficiaries
          ? String(fields.beneficiaries)
          : undefined,
      }
    case 'OTHER':
      return { branch, description: String(fields.description ?? '') }
  }
}

export function buildAutoFillDefaults(
  branch: InsuranceBranch,
  autoFill: AutoFillData | undefined,
  existingDefaults: Record<string, unknown>
): Record<string, unknown> {
  if (!autoFill || autoFill.clientPersonType !== 'COMPANY') {
    return existingDefaults
  }
  if (branch === 'BUSINESS' && !existingDefaults.legalName) {
    return {
      ...existingDefaults,
      legalName: autoFill.clientName ?? '',
      cnpj: autoFill.clientDocument ?? '',
    }
  }
  if (branch === 'CONDOMINIUM' && !existingDefaults.condominiumName) {
    return {
      ...existingDefaults,
      condominiumName: autoFill.clientName ?? '',
    }
  }
  return existingDefaults
}
