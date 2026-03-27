import React from 'react'
import { View, Text, Image } from '@react-pdf/renderer'
import { styles } from './pdf-styles.js'

interface PdfHeaderProps {
  readonly orgName: string
  readonly logoUrl: string | null
  readonly docTitle: string
  readonly docDate: string
  readonly docNumber?: string
}

export function PdfHeader({
  orgName,
  logoUrl,
  docTitle,
  docDate,
  docNumber,
}: PdfHeaderProps) {
  return (
    <View style={styles.header}>
      <View>
        {logoUrl ? (
          <Image src={logoUrl} style={styles.headerLogo} />
        ) : (
          <Text style={styles.headerOrgName}>{orgName}</Text>
        )}
        {logoUrl ? <Text style={styles.headerOrgName}>{orgName}</Text> : null}
        <Text style={styles.headerDocTitle}>{docTitle}</Text>
      </View>
      <View style={styles.headerMeta}>
        <Text style={styles.headerMetaText}>Data: {docDate}</Text>
        {docNumber ? (
          <Text style={styles.headerMetaText}>N.: {docNumber}</Text>
        ) : null}
      </View>
    </View>
  )
}
