import React from 'react'
import { View, Text } from '@react-pdf/renderer'
import type {
  InsuredObjectDetails,
  AutoDetails,
  ResidentialDetails,
  CondominiumDetails,
  BusinessDetails,
  LifeDetails,
  OtherDetails,
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

function AutoSection({ details }: { readonly details: AutoDetails }) {
  return (
    <>
      <View style={styles.row}>
        <FieldRow label="Marca" value={details.marca} />
        <FieldRow label="Modelo" value={details.modelo} />
      </View>
      <View style={styles.row}>
        <FieldRow label="Ano Fab." value={details.anoFabricacao} />
        <FieldRow label="Ano Modelo" value={details.anoModelo} />
      </View>
      <View style={styles.row}>
        <FieldRow label="Placa" value={details.placa} />
        <FieldRow label="Cor" value={details.cor} />
      </View>
      <View style={styles.row}>
        <FieldRow label="Combustível" value={details.combustivel} />
        <FieldRow label="Uso" value={details.usoVeiculo} />
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
        <FieldRow label="Tipo de Imóvel" value={details.tipoImovel} />
        <FieldRow label="Uso" value={details.usoImovel} />
      </View>
      <View style={styles.row}>
        <FieldRow label="CEP" value={details.cep} />
        <FieldRow label="Área (m²)" value={details.areaM2} />
      </View>
      <View style={styles.row}>
        <FieldRow label="Endereço" value={details.endereco} />
        <FieldRow label="Construção" value={details.construcao} />
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
        <FieldRow label="Nome do Condomínio" value={details.nomeCondominio} />
        <FieldRow label="Unidades" value={details.numeroUnidades} />
      </View>
      <View style={styles.row}>
        <FieldRow label="CEP" value={details.cep} />
        <FieldRow label="Andares" value={details.numeroAndares} />
      </View>
      <View style={styles.row}>
        <FieldRow label="Endereço" value={details.endereco} />
        <FieldRow label="Ano Construção" value={details.anoConstrucao} />
      </View>
    </>
  )
}

function BusinessSection({ details }: { readonly details: BusinessDetails }) {
  return (
    <>
      <View style={styles.row}>
        <FieldRow label="Razão Social" value={details.razaoSocial} />
        <FieldRow label="CNPJ" value={details.cnpj} />
      </View>
      <View style={styles.row}>
        <FieldRow label="Atividade" value={details.atividade} />
        <FieldRow label="Área (m²)" value={details.areaM2} />
      </View>
      <View style={styles.row}>
        <FieldRow label="CEP" value={details.cep} />
        <FieldRow label="Endereço" value={details.endereco} />
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
    details.alturaEmCentimetros && details.pesoEmGramas
      ? (
          details.pesoEmGramas /
          1000 /
          Math.pow(details.alturaEmCentimetros / 100, 2)
        ).toFixed(1)
      : null

  return (
    <>
      <View style={styles.row}>
        <FieldRow label="Profissão" value={details.profissao} />
        <FieldRow
          label="Renda Mensal"
          value={
            details.rendaMensalCentavos
              ? formatCentsAsCurrency(details.rendaMensalCentavos)
              : undefined
          }
        />
      </View>
      <View style={styles.row}>
        <FieldRow label="Fumante" value={details.fumante} />
        <FieldRow label="Esportes Radicais" value={details.esportesRadicais} />
      </View>
      <View style={styles.row}>
        <FieldRow
          label="Altura"
          value={
            details.alturaEmCentimetros
              ? `${details.alturaEmCentimetros} cm`
              : undefined
          }
        />
        <FieldRow
          label="Peso"
          value={
            details.pesoEmGramas
              ? `${(details.pesoEmGramas / 1000).toFixed(1)} kg`
              : undefined
          }
        />
      </View>
      {imc ? (
        <View style={styles.row}>
          <FieldRow label="IMC" value={imc} />
        </View>
      ) : null}
      {details.beneficiarios ? (
        <View style={styles.row}>
          <FieldRow label="Beneficiários" value={details.beneficiarios} />
        </View>
      ) : null}
    </>
  )
}

function OtherSection({ details }: { readonly details: OtherDetails }) {
  return (
    <View style={styles.row}>
      <FieldRow label="Descrição" value={details.descricao} />
    </View>
  )
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
      {details.branch === 'AUTO' && (
        <AutoSection details={details as AutoDetails} />
      )}
      {details.branch === 'RESIDENTIAL' && (
        <ResidentialSection details={details as ResidentialDetails} />
      )}
      {details.branch === 'CONDOMINIUM' && (
        <CondominiumSection details={details as CondominiumDetails} />
      )}
      {details.branch === 'BUSINESS' && (
        <BusinessSection details={details as BusinessDetails} />
      )}
      {details.branch === 'LIFE' && (
        <LifeSection details={details as LifeDetails} />
      )}
      {details.branch === 'OTHER' && (
        <OtherSection details={details as OtherDetails} />
      )}
    </View>
  )
}
