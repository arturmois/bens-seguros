import React from 'react'
import { View, Text } from '@react-pdf/renderer'
import type {
  AutoDetails,
  BusinessDetails,
  CondominiumDetails,
  InsuredObjectDetails,
  LifeDetails,
  OtherDetails,
  ResidentialDetails,
} from '@repo/core'
import { styles } from './pdf-styles.js'

interface FieldRowProps {
  readonly label: string
  readonly value: string | number | boolean | undefined | null
}

function FieldRow({ label, value }: FieldRowProps) {
  if (value === undefined || value === null || value === '') return null
  const displayValue =
    typeof value === 'boolean' ? (value ? 'Sim' : 'Não') : String(value)
  return (
    <View style={styles.col2}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{displayValue}</Text>
    </View>
  )
}

interface StructuredAddress {
  readonly street?: string
  readonly number?: string
  readonly complement?: string
  readonly neighborhood?: string
  readonly city?: string
  readonly state?: string
}

function formatAddress(details: StructuredAddress): string | undefined {
  const line1 = [details.street, details.number].filter(Boolean).join(', ')
  const withComplement = details.complement
    ? `${line1}${line1 ? ' - ' : ''}${details.complement}`
    : line1
  const line2 = [details.neighborhood, details.city, details.state]
    .filter(Boolean)
    .join(' — ')
  const combined = [withComplement, line2].filter(Boolean).join(' · ')
  return combined.length > 0 ? combined : undefined
}

function AutoSection({ details }: { readonly details: AutoDetails }) {
  return (
    <>
      <View style={styles.row}>
        <FieldRow label="Veículo" value={details.vehicle} />
        <FieldRow label="Ano Fab." value={details.manufacturingYear} />
      </View>
      <View style={styles.row}>
        <FieldRow label="Ano Modelo" value={details.modelYear} />
        <FieldRow label="Placa" value={details.licensePlate} />
      </View>
      <View style={styles.row}>
        <FieldRow label="Cor" value={details.color} />
        <FieldRow label="Combustível" value={details.fuelType} />
      </View>
      <View style={styles.row}>
        <FieldRow label="Uso" value={details.vehicleUsage} />
      </View>
    </>
  )
}

function ResidentialSection({
  details,
}: {
  readonly details: ResidentialDetails
}) {
  return (
    <>
      <View style={styles.row}>
        <FieldRow label="Tipo de Imóvel" value={details.propertyType} />
        <FieldRow label="Uso" value={details.propertyUsage} />
      </View>
      <View style={styles.row}>
        <FieldRow label="CEP" value={details.cep} />
        <FieldRow label="Área (m²)" value={details.areaM2} />
      </View>
      <View style={styles.row}>
        <FieldRow label="Endereço" value={formatAddress(details)} />
        <FieldRow label="Construção" value={details.construction} />
      </View>
    </>
  )
}

function CondominiumSection({
  details,
}: {
  readonly details: CondominiumDetails
}) {
  return (
    <>
      <View style={styles.row}>
        <FieldRow label="Nome do Condomínio" value={details.condominiumName} />
        <FieldRow label="Unidades" value={details.unitCount} />
      </View>
      <View style={styles.row}>
        <FieldRow label="CEP" value={details.cep} />
        <FieldRow label="Andares" value={details.floorCount} />
      </View>
      <View style={styles.row}>
        <FieldRow label="Endereço" value={formatAddress(details)} />
        <FieldRow label="Ano Construção" value={details.constructionYear} />
      </View>
    </>
  )
}

function BusinessSection({ details }: { readonly details: BusinessDetails }) {
  return (
    <>
      <View style={styles.row}>
        <FieldRow label="Razão Social" value={details.legalName} />
        <FieldRow label="CNPJ" value={details.cnpj} />
      </View>
      <View style={styles.row}>
        <FieldRow label="Atividade" value={details.businessActivity} />
        <FieldRow label="Área (m²)" value={details.areaM2} />
      </View>
      <View style={styles.row}>
        <FieldRow label="CEP" value={details.cep} />
        <FieldRow label="Endereço" value={formatAddress(details)} />
      </View>
    </>
  )
}

function formatCentsAsCurrency(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function LifeSection({ details }: { readonly details: LifeDetails }) {
  const imc =
    details.heightInCentimeters && details.weightInGrams
      ? (
          details.weightInGrams /
          1000 /
          Math.pow(details.heightInCentimeters / 100, 2)
        ).toFixed(1)
      : null
  return (
    <>
      <View style={styles.row}>
        <FieldRow label="Profissão" value={details.occupation} />
        <FieldRow
          label="Renda Mensal"
          value={
            details.monthlyIncomeCents
              ? formatCentsAsCurrency(details.monthlyIncomeCents)
              : undefined
          }
        />
      </View>
      <View style={styles.row}>
        <FieldRow label="Fumante" value={details.isSmoker} />
        <FieldRow label="Esportes Radicais" value={details.extremeSports} />
      </View>
      <View style={styles.row}>
        <FieldRow
          label="Altura"
          value={
            details.heightInCentimeters
              ? `${details.heightInCentimeters} cm`
              : undefined
          }
        />
        <FieldRow
          label="Peso"
          value={
            details.weightInGrams
              ? `${(details.weightInGrams / 1000).toFixed(1)} kg`
              : undefined
          }
        />
      </View>
      {imc ? (
        <View style={styles.row}>
          <FieldRow label="IMC" value={imc} />
        </View>
      ) : null}
      {details.beneficiaries ? (
        <View style={styles.row}>
          <FieldRow label="Beneficiários" value={details.beneficiaries} />
        </View>
      ) : null}
    </>
  )
}

function OtherSection({ details }: { readonly details: OtherDetails }) {
  return (
    <View style={styles.row}>
      <FieldRow label="Descrição" value={details.description} />
    </View>
  )
}

function renderBranchDetails(details: InsuredObjectDetails) {
  switch (details.branch) {
    case 'AUTO':
      return <AutoSection details={details} />
    case 'RESIDENTIAL':
      return <ResidentialSection details={details} />
    case 'CONDOMINIUM':
      return <CondominiumSection details={details} />
    case 'BUSINESS':
      return <BusinessSection details={details} />
    case 'LIFE':
      return <LifeSection details={details} />
    case 'OTHER':
      return <OtherSection details={details} />
  }
}

interface InsuredObjectSectionProps {
  readonly details: InsuredObjectDetails
}

export function InsuredObjectSection({ details }: InsuredObjectSectionProps) {
  const branchLabels: Record<InsuredObjectDetails['branch'], string> = {
    AUTO: 'Veículo',
    RESIDENTIAL: 'Imóvel Residencial',
    CONDOMINIUM: 'Condomínio',
    BUSINESS: 'Empresa',
    LIFE: 'Vida',
    OTHER: 'Outros',
  }
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        Objeto Segurado — {branchLabels[details.branch]}
      </Text>
      {renderBranchDetails(details)}
    </View>
  )
}
