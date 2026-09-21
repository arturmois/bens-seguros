import React from 'react'
import { Document, Page, View, Text } from '@react-pdf/renderer'
import type { ProposalJson } from '@repo/core'
import { maskDocument } from '@repo/shared'
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

interface OrganizationData {
  readonly id: string
  readonly name: string
  readonly logo: string | null
  readonly creci?: string
}

interface ProposalQuotePdfProps {
  readonly proposal: ProposalJson
  readonly organization: OrganizationData
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

function ClientSection({ proposal }: { readonly proposal: ProposalJson }) {
  const maskedDoc = proposal.clientDocument
    ? maskDocument(proposal.clientDocument)
    : '—'
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Dados do Cliente</Text>
      <View style={styles.row}>
        <View style={styles.col2}>
          <Text style={styles.label}>Nome</Text>
          <Text style={styles.value}>{proposal.clientName ?? '—'}</Text>
        </View>
        <View style={styles.col2}>
          <Text style={styles.label}>CPF / CNPJ</Text>
          <Text style={styles.value}>{maskedDoc}</Text>
        </View>
      </View>
    </View>
  )
}

function CoverageSection({ proposal }: { readonly proposal: ProposalJson }) {
  const commissionPercent = (
    proposal.commissionPercentageInCents / 100
  ).toFixed(2)
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Condições Comerciais</Text>
      <View style={styles.row}>
        <View style={styles.col2}>
          <Text style={styles.label}>Ramo</Text>
          <Text style={styles.value}>
            {BRANCH_LABELS[proposal.branch] ?? proposal.branch}
          </Text>
        </View>
        <View style={styles.col2}>
          <Text style={styles.label}>Seguradora</Text>
          <Text style={styles.value}>{proposal.insurerName ?? '—'}</Text>
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.highlightBox}>
          <Text style={styles.highlightLabel}>Prêmio Total</Text>
          <Text style={styles.highlightValue}>
            {formatCurrency(proposal.premiumValueInCents)}
          </Text>
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.col2}>
          <Text style={styles.label}>Comissão</Text>
          <Text style={styles.value}>{commissionPercent}%</Text>
        </View>
        <View style={styles.col2}>
          <Text style={styles.label}>Tipo</Text>
          <Text style={styles.value}>
            {proposal.boardType === 'RENEWAL' ? 'Renovação' : 'Novo Seguro'}
          </Text>
        </View>
      </View>
    </View>
  )
}

function CoverageDatesSection({
  proposal,
}: {
  readonly proposal: ProposalJson
}) {
  if (!proposal.coverageStartDate && !proposal.coverageEndDate) {
    return null
  }
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Vigência Proposta</Text>
      <View style={styles.row}>
        <View style={styles.col2}>
          <Text style={styles.label}>Início</Text>
          <Text style={styles.value}>
            {proposal.coverageStartDate
              ? formatDate(proposal.coverageStartDate)
              : '—'}
          </Text>
        </View>
        <View style={styles.col2}>
          <Text style={styles.label}>Fim</Text>
          <Text style={styles.value}>
            {proposal.coverageEndDate
              ? formatDate(proposal.coverageEndDate)
              : '—'}
          </Text>
        </View>
      </View>
    </View>
  )
}

function ValiditySection({ proposal }: { readonly proposal: ProposalJson }) {
  const validUntil = proposal.quoteValidUntil
    ? formatDate(proposal.quoteValidUntil)
    : '—'
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Validade da Cotação</Text>
      <View style={styles.row}>
        <View style={styles.col2}>
          <Text style={styles.label}>Data da Cotação</Text>
          <Text style={styles.value}>{formatDate(proposal.createdAt)}</Text>
        </View>
        <View style={styles.col2}>
          <Text style={styles.label}>Válida Até</Text>
          <Text style={styles.value}>{validUntil}</Text>
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.col2}>
          <Text style={styles.label}>Corretor</Text>
          <Text style={styles.value}>{proposal.salespersonName ?? '—'}</Text>
        </View>
      </View>
    </View>
  )
}

export function ProposalQuotePdf({
  proposal,
  organization,
}: ProposalQuotePdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PdfHeader
          orgName={organization.name}
          logoUrl={organization.logo}
          docTitle="COTAÇÃO DE SEGURO"
          docDate={formatDate(proposal.createdAt)}
          docNumber={proposal.id.slice(0, 8).toUpperCase()}
        />
        <ClientSection proposal={proposal} />
        <CoverageSection proposal={proposal} />
        <CoverageDatesSection proposal={proposal} />
        {proposal.details ? (
          <InsuredObjectSection details={proposal.details} />
        ) : null}
        <ValiditySection proposal={proposal} />
        <PdfFooter
          salespersonName={proposal.salespersonName ?? organization.name}
          creci={organization.creci}
          validity={
            proposal.quoteValidUntil
              ? formatDate(proposal.quoteValidUntil)
              : '—'
          }
        />
      </Page>
    </Document>
  )
}
