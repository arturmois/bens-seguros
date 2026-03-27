import React from 'react'
import { View, Text } from '@react-pdf/renderer'
import { styles } from './pdf-styles.js'

interface PdfFooterProps {
  readonly salespersonName: string
  readonly creci?: string
  readonly validity?: string
}

export function PdfFooter({
  salespersonName,
  creci,
  validity,
}: PdfFooterProps) {
  return (
    <View style={styles.footer} fixed>
      <View>
        <Text style={styles.footerBold}>{salespersonName}</Text>
        {creci ? <Text style={styles.footerText}>CRECI: {creci}</Text> : null}
      </View>
      <View>
        {validity ? (
          <Text style={styles.footerText}>Validade: {validity}</Text>
        ) : null}
      </View>
      <Text
        style={styles.footerText}
        render={({ pageNumber, totalPages }) =>
          `Pag. ${pageNumber} / ${totalPages}`
        }
        fixed
      />
    </View>
  )
}
