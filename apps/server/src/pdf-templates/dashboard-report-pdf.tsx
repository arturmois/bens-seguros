import React from 'react'
import { Document, Page, View, Text } from '@react-pdf/renderer'
import { styles } from './pdf-styles.js'
import { PdfHeader } from './pdf-header.js'
import { PdfFooter } from './pdf-footer.js'

interface MetricComparison {
  readonly current: number
  readonly previous: number
  readonly changePercent: number
}

interface DashboardReportPdfProps {
  readonly organization: {
    readonly name: string
    readonly logoUrl: string | null
  }
  readonly period: string
  readonly generatedBy: string
  readonly comparison: {
    readonly proposals: MetricComparison
    readonly policies: MetricComparison
    readonly claims: MetricComparison
    readonly commissionsPending: MetricComparison
  }
  readonly totalPremium: MetricComparison
  readonly averageTicket: MetricComparison
  readonly commissionsReceivable: number
  readonly ranking: ReadonlyArray<{
    readonly salespersonName: string
    readonly policiesIssued: number
    readonly totalPremiumCents: number
    readonly averageTicketCents: number
  }>
}

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function formatChange(percent: number): string {
  return percent >= 0 ? `+${percent}%` : `${percent}%`
}

function KpiRow({
  label,
  current,
  previous,
  changePercent,
  isCurrency,
}: {
  readonly label: string
  readonly current: number
  readonly previous: number
  readonly changePercent: number
  readonly isCurrency: boolean
}) {
  const currentLabel = isCurrency ? formatCurrency(current) : String(current)
  const previousLabel = isCurrency ? formatCurrency(previous) : String(previous)

  return (
    <View style={styles.tableRow}>
      <Text style={[styles.tableCell, { flex: 2 }]}>{label}</Text>
      <Text style={styles.tableCellRight}>{currentLabel}</Text>
      <Text style={styles.tableCellRight}>{previousLabel}</Text>
      <Text style={styles.tableCellRight}>{formatChange(changePercent)}</Text>
    </View>
  )
}

function RankingSection({
  ranking,
}: {
  readonly ranking: DashboardReportPdfProps['ranking']
}) {
  if (ranking.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ranking de Corretores</Text>
        <Text style={styles.label}>Nenhuma apolice emitida no periodo.</Text>
      </View>
    )
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Ranking de Corretores</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { flex: 0.3 }]}>#</Text>
          <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Corretor</Text>
          <Text style={styles.tableHeaderCell}>Emitidas</Text>
          <Text style={styles.tableHeaderCell}>Premio Total</Text>
          <Text style={styles.tableHeaderCell}>Ticket Medio</Text>
        </View>
        {ranking.map((entry, index) => (
          <View
            key={entry.salespersonName}
            style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
          >
            <Text style={[styles.tableCell, { flex: 0.3 }]}>{index + 1}</Text>
            <Text style={[styles.tableCell, { flex: 2 }]}>
              {entry.salespersonName}
            </Text>
            <Text style={styles.tableCellRight}>{entry.policiesIssued}</Text>
            <Text style={styles.tableCellRight}>
              {formatCurrency(entry.totalPremiumCents)}
            </Text>
            <Text style={styles.tableCellRight}>
              {formatCurrency(entry.averageTicketCents)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}

export function DashboardReportPdf({
  organization,
  period,
  generatedBy,
  comparison,
  totalPremium,
  averageTicket,
  commissionsReceivable,
  ranking,
}: DashboardReportPdfProps) {
  const today = new Date().toLocaleDateString('pt-BR')

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PdfHeader
          orgName={organization.name}
          logoUrl={organization.logoUrl}
          docTitle="RELATORIO GERENCIAL"
          docDate={today}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Indicadores — {period}</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>
                Indicador
              </Text>
              <Text style={styles.tableHeaderCell}>Atual</Text>
              <Text style={styles.tableHeaderCell}>Anterior</Text>
              <Text style={styles.tableHeaderCell}>Variacao</Text>
            </View>
            <KpiRow
              label="Propostas"
              current={comparison.proposals.current}
              previous={comparison.proposals.previous}
              changePercent={comparison.proposals.changePercent}
              isCurrency={false}
            />
            <KpiRow
              label="Apolices"
              current={comparison.policies.current}
              previous={comparison.policies.previous}
              changePercent={comparison.policies.changePercent}
              isCurrency={false}
            />
            <KpiRow
              label="Sinistros"
              current={comparison.claims.current}
              previous={comparison.claims.previous}
              changePercent={comparison.claims.changePercent}
              isCurrency={false}
            />
            <KpiRow
              label="Comissoes Pendentes"
              current={comparison.commissionsPending.current}
              previous={comparison.commissionsPending.previous}
              changePercent={comparison.commissionsPending.changePercent}
              isCurrency={true}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Metricas Financeiras</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Metrica</Text>
              <Text style={styles.tableHeaderCell}>Atual</Text>
              <Text style={styles.tableHeaderCell}>Anterior</Text>
              <Text style={styles.tableHeaderCell}>Variacao</Text>
            </View>
            <KpiRow
              label="Premio Total"
              current={totalPremium.current}
              previous={totalPremium.previous}
              changePercent={totalPremium.changePercent}
              isCurrency={true}
            />
            <KpiRow
              label="Ticket Medio"
              current={averageTicket.current}
              previous={averageTicket.previous}
              changePercent={averageTicket.changePercent}
              isCurrency={true}
            />
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2 }]}>
                Comissoes a Receber
              </Text>
              <Text style={styles.tableCellRight}>
                {formatCurrency(commissionsReceivable)}
              </Text>
              <Text style={styles.tableCellRight}>—</Text>
              <Text style={styles.tableCellRight}>—</Text>
            </View>
          </View>
        </View>

        <RankingSection ranking={ranking} />

        <PdfFooter salespersonName={generatedBy} />
      </Page>
    </Document>
  )
}
