import React from 'react'
import { View, Text } from '@react-pdf/renderer'
import { styles } from './pdf-styles.js'

export interface RankingEntry {
  readonly salespersonName: string
  readonly policiesIssued: number
  readonly totalPremiumCents: number
  readonly averageTicketCents: number
}

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export function formatChange(percent: number): string {
  return percent >= 0 ? `+${percent}%` : `${percent}%`
}

export function formatMetric(
  value: number,
  format: 'currency' | 'count'
): string {
  return format === 'currency' ? formatCurrency(value) : String(value)
}

export function KpiRow({
  label,
  current,
  previous,
  changePercent,
  format,
}: {
  readonly label: string
  readonly current: number
  readonly previous: number
  readonly changePercent: number
  readonly format: 'currency' | 'count'
}) {
  return (
    <View style={styles.tableRow}>
      <Text style={[styles.tableCell, { flex: 2 }]}>{label}</Text>
      <Text style={styles.tableCellRight}>{formatMetric(current, format)}</Text>
      <Text style={styles.tableCellRight}>
        {formatMetric(previous, format)}
      </Text>
      <Text style={styles.tableCellRight}>{formatChange(changePercent)}</Text>
    </View>
  )
}

export function RankingSection({
  ranking,
}: {
  readonly ranking: ReadonlyArray<RankingEntry>
}) {
  if (ranking.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ranking de Corretores</Text>
        <Text style={styles.label}>Nenhuma apólice emitida no período.</Text>
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
