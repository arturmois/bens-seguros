import type { Metadata } from 'next'
import { LegalPageLayout } from '@/features/legal/components/legal-page-layout'
import { termsOfUse } from '@/features/legal/data/terms-of-use'

export const metadata: Metadata = {
  title: 'Termos de Uso — Bens Seguros',
  description:
    'Termos de Uso da plataforma Bens Seguros — ERP para corretoras de seguros.',
}

export default function TermsOfUsePage() {
  return <LegalPageLayout document={termsOfUse} />
}
