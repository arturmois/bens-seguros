import { Logo } from '@/components/shared/logo'
import Link from 'next/link'

const FOOTER_LINKS = [
  { label: 'Termos', href: '/terms' },
  { label: 'Privacidade', href: '/privacy' },
  { label: 'Contato', href: '/#faq' },
] as const

export function MarketingFooter(): React.ReactElement {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-[#0f172a]">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-8 md:flex-row md:justify-between">
        <Link href="/" aria-label="Bens Seguros - Página inicial">
          <Logo size="sm" className="text-white" />
        </Link>

        <nav aria-label="Links do rodapé">
          <ul className="flex items-center gap-6">
            {FOOTER_LINKS.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className="text-sm text-slate-400 transition-colors hover:text-slate-200"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <p className="text-sm text-slate-500">{currentYear} Bens Seguros</p>
      </div>
    </footer>
  )
}
