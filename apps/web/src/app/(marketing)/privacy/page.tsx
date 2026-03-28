import type { Metadata } from 'next'
import { LegalPageLayout } from '@/features/legal/components/legal-page-layout'
import { privacyPolicy } from '@/features/legal/data/privacy-policy'

export const metadata: Metadata = {
  title: 'Política de Privacidade — Bens Seguros',
  description:
    'Política de Privacidade da plataforma Bens Seguros — Conforme LGPD.',
}

export default function PrivacyPolicyPage() {
  return <LegalPageLayout document={privacyPolicy} />
}
