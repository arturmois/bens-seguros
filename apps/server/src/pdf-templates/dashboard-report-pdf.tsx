import React from 'react'
import { Document, Page, View, Text } from '@react-pdf/renderer'
import { styles } from './pdf-styles.js'
import { PdfHeader } from './pdf-header.js'
import { PdfFooter } from './pdf-footer.js'
import {
  KpiRow,
  RankingSection,
  formatMetric,
} from './dashboard-report-sections.js'
import type { RankingEntry } from './dashboard-report-sections.js'

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
  readonly ranking: ReadonlyArray<RankingEntry>
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
              format="count"
            />
            <KpiRow
              label="Apolices"
              current={comparison.policies.current}
              previous={comparison.policies.previous}
              changePercent={comparison.policies.changePercent}
              format="count"
            />
            <KpiRow
              label="Sinistros"
              current={comparison.claims.current}
              previous={comparison.claims.previous}
              changePercent={comparison.claims.changePercent}
              format="count"
            />
            <KpiRow
              label="Comissoes Pendentes"
              current={comparison.commissionsPending.current}
              previous={comparison.commissionsPending.previous}
              changePercent={comparison.commissionsPending.changePercent}
              format="currency"
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
              format="currency"
            />
            <KpiRow
              label="Ticket Medio"
              current={averageTicket.current}
              previous={averageTicket.previous}
              changePercent={averageTicket.changePercent}
              format="currency"
            />
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2 }]}>
                Comissoes a Receber
              </Text>
              <Text style={styles.tableCellRight}>
                {formatMetric(commissionsReceivable, 'currency')}
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
