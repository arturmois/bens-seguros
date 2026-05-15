import React from 'react'
import { Document, Page, View, Text } from '@react-pdf/renderer'
import type { PolicyData } from '@repo/core'
import { isInsuredObjectDetails } from '@repo/core'
import { styles } from './pdf-styles.js'
import { PdfHeader } from './pdf-header.js'
import { PdfFooter } from './pdf-footer.js'
import { InsuredObjectSection } from './insured-object-section.js'

const BRANCH_LABELS: Record<string, string> = {
  AUTO: 'Automóvel',
  RESIDENTIAL: 'Residencial',
  CONDOMINIUM: 'Condomínio',
  BUSINESS: 'Empresarial',
  LIFE: 'Vida',
  OTHER: 'Outros',
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Ativa',
  CANCELLED: 'Cancelada',
  EXPIRED: 'Expirada',
}

const BOARD_TYPE_LABELS: Record<string, string> = {
  NEW_INSURANCE: 'Novo Seguro',
  RENEWAL: 'Renovação',
  ENDORSEMENT: 'Endosso',
}

interface OrganizationData {
  readonly id: string
  readonly name: string
  readonly logo: string | null
  readonly creci?: string
}

interface ClientFullData {
  readonly name: string
  readonly document: string
  readonly email: string | null
  readonly phone: string | null
  readonly address: Record<string, string> | null
}

interface PolicySummaryPdfProps {
  readonly policy: PolicyData
  readonly organization: OrganizationData
  readonly clientFull?: ClientFullData | null
}

function displayOrFallback(
  value: string | null | undefined,
  fallback = 'Não informado'
): string {
  return value && value.trim() !== '' ? value : fallback
}

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('pt-BR')
}

function buildAddressDisplay(address: Record<string, string> | null): string {
  if (!address) return 'Não informado'
  const parts = Object.values(address).filter((v) => v && v.trim() !== '')
  return parts.length > 0 ? parts.join(', ') : 'Não informado'
}

function formatCepDisplay(cep: string): string {
  const digits = cep.replace(/\D/g, '')
  if (digits.length !== 8) return cep
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

function policyAddressToDisplayRecord(
  policyAddress: PolicyData['clientAddress']
): Record<string, string> | null {
  if (!policyAddress) return null
  const address: Record<string, string> = {
    street: policyAddress.number
      ? `${policyAddress.street}, ${policyAddress.number}`
      : policyAddress.street,
    neighborhood: policyAddress.neighborhood,
    city: `${policyAddress.city}/${policyAddress.state}`,
    cep: formatCepDisplay(policyAddress.cep),
  }
  if (policyAddress.complement) address.complement = policyAddress.complement
  return address
}

interface ClientSectionProps {
  readonly policy: PolicyData
  readonly clientFull?: ClientFullData | null
}

function ClientSection({ policy, clientFull }: ClientSectionProps) {
  const name = displayOrFallback(clientFull?.name ?? policy.clientName)
  const document = displayOrFallback(
    clientFull?.document ?? policy.clientDocument
  )
  const email = displayOrFallback(clientFull?.email ?? policy.clientEmail)
  const phone = displayOrFallback(clientFull?.phone ?? policy.clientPhone)
  const address = buildAddressDisplay(
    clientFull?.address ?? policyAddressToDisplayRecord(policy.clientAddress)
  )
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Segurado</Text>
      <View style={styles.row}>
        <View style={styles.col2}>
          <Text style={styles.label}>Nome</Text>
          <Text style={styles.value}>{name}</Text>
        </View>
        <View style={styles.col2}>
          <Text style={styles.label}>CPF / CNPJ</Text>
          <Text style={styles.value}>{document}</Text>
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.col2}>
          <Text style={styles.label}>E-mail</Text>
          <Text style={styles.value}>{email}</Text>
        </View>
        <View style={styles.col2}>
          <Text style={styles.label}>Telefone</Text>
          <Text style={styles.value}>{phone}</Text>
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.col2}>
          <Text style={styles.label}>Endereço</Text>
          <Text style={styles.value}>{address}</Text>
        </View>
      </View>
    </View>
  )
}

function PolicyInfoSection({ policy }: { readonly policy: PolicyData }) {
  const boardTypeLabel =
    BOARD_TYPE_LABELS[policy.boardType ?? ''] ?? 'Não informado'
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Dados da Apólice</Text>
      <View style={styles.row}>
        <View style={styles.col2}>
          <Text style={styles.label}>Número da Apólice</Text>
          <Text style={styles.value}>{policy.policyNumber}</Text>
        </View>
        <View style={styles.col2}>
          <Text style={styles.label}>Status</Text>
          <Text style={styles.value}>
            {STATUS_LABELS[policy.status] ?? policy.status}
          </Text>
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.col2}>
          <Text style={styles.label}>Ramo</Text>
          <Text style={styles.value}>
            {BRANCH_LABELS[policy.branch] ?? policy.branch}
          </Text>
        </View>
        <View style={styles.col2}>
          <Text style={styles.label}>Seguradora</Text>
          <Text style={styles.value}>
            {displayOrFallback(policy.insurerName)}
          </Text>
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.col2}>
          <Text style={styles.label}>Tipo</Text>
          <Text style={styles.value}>{boardTypeLabel}</Text>
        </View>
      </View>
    </View>
  )
}

function VigencySection({ policy }: { readonly policy: PolicyData }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Vigência</Text>
      <View style={styles.row}>
        <View style={styles.col2}>
          <Text style={styles.label}>Início</Text>
          <Text style={styles.value}>{formatDate(policy.startDate)}</Text>
        </View>
        <View style={styles.col2}>
          <Text style={styles.label}>Fim</Text>
          <Text style={styles.value}>{formatDate(policy.endDate)}</Text>
        </View>
      </View>
    </View>
  )
}

function PremiumSection({ policy }: { readonly policy: PolicyData }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Prêmio</Text>
      <View style={styles.row}>
        <View style={styles.highlightBox}>
          <Text style={styles.highlightLabel}>Prêmio Total</Text>
          <Text style={styles.highlightValue}>
            {formatCurrency(policy.premiumValueInCents)}
          </Text>
        </View>
      </View>
    </View>
  )
}

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

function formatCoverageValue(val: JsonValue): string {
  if (val === null) return '—'
  if (typeof val === 'boolean') return val ? 'Sim' : 'Não'
  if (typeof val === 'number') return val.toLocaleString('pt-BR')
  if (typeof val === 'string') return val
  return JSON.stringify(val)
}

function CoverageSection({ policy }: { readonly policy: PolicyData }) {
  if (!policy.coverageDetails) return null
  const entries = Object.entries(policy.coverageDetails)
  if (entries.length === 0) return null
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Coberturas</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableHeaderCell}>Cobertura</Text>
          <Text style={styles.tableHeaderCell}>Detalhe</Text>
        </View>
        {entries.map(([coverageKey, val], index) => {
          const displayVal = formatCoverageValue(val)
          const rowStyle =
            index % 2 === 0 ? styles.tableRow : styles.tableRowAlt
          return (
            <React.Fragment key={coverageKey}>
              <View style={rowStyle}>
                <Text style={styles.tableCell}>{coverageKey}</Text>
                <Text style={styles.tableCell}>{displayVal}</Text>
              </View>
            </React.Fragment>
          )
        })}
      </View>
    </View>
  )
}

function InsuredObjectFallbackSection() {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Objeto Segurado</Text>
      <View style={styles.row}>
        <View style={styles.col2}>
          <Text style={styles.value}>Não informado</Text>
        </View>
      </View>
    </View>
  )
}

function CancelSection({ policy }: { readonly policy: PolicyData }) {
  if (policy.status !== 'CANCELLED' || !policy.cancelledAt) return null
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Cancelamento</Text>
      <View style={styles.row}>
        <View style={styles.col2}>
          <Text style={styles.label}>Data de Cancelamento</Text>
          <Text style={styles.value}>{formatDate(policy.cancelledAt)}</Text>
        </View>
        <View style={styles.col2}>
          <Text style={styles.label}>Motivo</Text>
          <Text style={styles.value}>{policy.cancelReason ?? '—'}</Text>
        </View>
      </View>
    </View>
  )
}

export function PolicySummaryPdf({
  policy,
  organization,
  clientFull,
}: PolicySummaryPdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PdfHeader
          orgName={organization.name}
          logoUrl={organization.logo}
          docTitle="APÓLICE DE SEGURO"
          docDate={formatDate(policy.createdAt)}
          docNumber={policy.policyNumber}
        />
        <PolicyInfoSection policy={policy} />
        <ClientSection policy={policy} clientFull={clientFull} />
        <VigencySection policy={policy} />
        <PremiumSection policy={policy} />
        {policy.proposalDetails &&
        isInsuredObjectDetails(policy.proposalDetails) ? (
          <InsuredObjectSection details={policy.proposalDetails} />
        ) : (
          <InsuredObjectFallbackSection />
        )}
        <CoverageSection policy={policy} />
        <CancelSection policy={policy} />
        <PdfFooter
          salespersonName={policy.salespersonName ?? organization.name}
          creci={organization.creci}
        />
      </Page>
    </Document>
  )
}
