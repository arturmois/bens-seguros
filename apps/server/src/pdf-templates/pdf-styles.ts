import { StyleSheet } from '@react-pdf/renderer'

export const COLORS = {
  primary: '#1e3a5f',
  accent: '#2563eb',
  muted: '#6b7280',
  border: '#e5e7eb',
  background: '#f9fafb',
  white: '#ffffff',
  text: '#111827',
} as const

export const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: COLORS.text,
    padding: 40,
    backgroundColor: COLORS.white,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  headerLogo: {
    width: 80,
    height: 40,
    objectFit: 'contain',
  },
  headerOrgName: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
  },
  headerDocTitle: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 4,
  },
  headerMeta: {
    alignItems: 'flex-end',
  },
  headerMetaText: {
    fontSize: 9,
    color: COLORS.muted,
    marginBottom: 2,
  },

  // Section
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  // Grid
  row: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  col2: {
    flex: 1,
    paddingRight: 12,
  },
  label: {
    fontSize: 9,
    color: COLORS.muted,
    marginBottom: 2,
  },
  value: {
    fontSize: 10,
    color: COLORS.text,
    fontFamily: 'Helvetica-Bold',
  },

  // Table
  table: {
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    padding: 6,
    borderRadius: 2,
  },
  tableHeaderCell: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.white,
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableRowAlt: {
    flexDirection: 'row',
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  tableCell: {
    fontSize: 9,
    color: COLORS.text,
    flex: 1,
  },
  tableCellRight: {
    fontSize: 9,
    color: COLORS.text,
    flex: 1,
    textAlign: 'right',
  },

  // Highlight box
  highlightBox: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    padding: 12,
    marginBottom: 12,
  },
  highlightLabel: {
    fontSize: 9,
    color: COLORS.muted,
    marginBottom: 2,
  },
  highlightValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 8,
    color: COLORS.muted,
  },
  footerBold: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.muted,
  },

  // Divider
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginVertical: 12,
  },

  // Badge / tag
  badge: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 8,
    color: COLORS.white,
    fontFamily: 'Helvetica-Bold',
  },
})
