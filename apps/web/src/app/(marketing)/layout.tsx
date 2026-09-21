import type { Metadata } from 'next'
import { MarketingNav } from '@/features/marketing/components/marketing-nav'
import { MarketingFooter } from '@/features/marketing/components/marketing-footer'

export const metadata: Metadata = {
  title: 'Bens Seguros — ERP para Corretoras de Seguros',
  description:
    'Gerencie propostas, apólices, comissões e atenda clientes pelo WhatsApp. O ERP completo para corretoras de seguros brasileiras.',
}

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}): React.ReactElement {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded focus:bg-accent-500 focus:px-4 focus:py-2 focus:text-slate-900"
      >
        Ir para conteúdo
      </a>
      <MarketingNav />
      <main id="main">{children}</main>
      <MarketingFooter />
    </>
  )
}
