'use client'

import { Logo } from '@/components/shared/logo'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Menu } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

const NAV_LINKS = [
  { label: 'Recursos', href: '/#recursos' },
  { label: 'Preços', href: '/#precos' },
  { label: 'Depoimentos', href: '/#depoimentos' },
  { label: 'Contato', href: '/#contato' },
] as const

export function MarketingNav(): React.ReactElement {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    function handleScroll(): void {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])
  return (
    <header
      className={`fixed top-0 right-0 left-0 z-50 transition-colors duration-300 ${
        scrolled
          ? 'border-white/6 border-b bg-[#0a101f]/80 backdrop-blur-xl'
          : 'bg-transparent'
      }`}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" aria-label="Bens Seguros - Página inicial">
          <Logo size="md" className="text-white" />
        </Link>
        <DesktopLinks />
        <div className="flex items-center gap-3">
          <DesktopActions />
          <MobileMenu open={open} onOpenChange={setOpen} />
        </div>
      </nav>
    </header>
  )
}

function DesktopLinks(): React.ReactElement {
  return (
    <ul className="hidden items-center gap-8 lg:flex">
      {NAV_LINKS.map((link) => (
        <li key={link.href}>
          <Link
            href={link.href}
            className="text-slate-300 text-sm transition-colors hover:text-white"
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  )
}

function DesktopActions(): React.ReactElement {
  return (
    <div className="hidden items-center gap-3 lg:flex">
      <Link
        href="/login"
        className="rounded-lg px-4 py-2 font-medium text-slate-300 text-sm transition-colors hover:text-white"
      >
        Login
      </Link>
      <Link
        href="/register"
        className="rounded-lg bg-linear-to-r from-accent-500 to-accent-600 px-5 py-2 font-semibold text-slate-900 text-sm shadow-accent-500/20 shadow-lg transition-all hover:shadow-accent-500/30"
      >
        Começar Grátis
      </Link>
    </div>
  )
}

function MobileMenu({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (value: boolean) => void
}): React.ReactElement {
  return (
    <div className="lg:hidden">
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetTrigger
          className="rounded-lg p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Abrir menu"
        >
          <Menu className="size-5" />
        </SheetTrigger>
        <SheetContent side="right" className="border-white/10 bg-[#0f172a]">
          <SheetHeader>
            <SheetTitle className="text-white">
              <Logo size="sm" className="text-white" />
            </SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-2 px-4 pt-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => onOpenChange(false)}
                className="rounded-lg px-3 py-2.5 text-slate-300 text-sm transition-colors hover:bg-white/5 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
            <hr className="my-2 border-white/10" />
            <Link
              href="/login"
              onClick={() => onOpenChange(false)}
              className="rounded-lg px-3 py-2.5 text-slate-300 text-sm transition-colors hover:bg-white/5 hover:text-white"
            >
              Login
            </Link>
            <Link
              href="/register"
              onClick={() => onOpenChange(false)}
              className="mt-2 rounded-lg bg-linear-to-r from-accent-500 to-accent-600 px-5 py-2.5 text-center font-semibold text-slate-900 text-sm transition-all"
            >
              Começar Grátis
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
