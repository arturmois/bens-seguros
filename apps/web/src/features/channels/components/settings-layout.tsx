'use client'

import Link from 'next/link'
import { Brain, Building2, Radio, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

type SettingsSection = 'canais' | 'agentes-ia' | 'membros' | 'organizacao'

interface SettingsSidebarItem {
  readonly id: SettingsSection
  readonly label: string
  readonly icon: typeof Radio
  readonly disabled: boolean
  readonly href: string
}

const SETTINGS_SECTIONS: readonly SettingsSidebarItem[] = [
  {
    id: 'canais',
    label: 'Canais',
    icon: Radio,
    disabled: false,
    href: '/settings?section=canais',
  },
  {
    id: 'agentes-ia',
    label: 'Agentes IA',
    icon: Brain,
    disabled: false,
    href: '/settings?section=agentes-ia',
  },
  {
    id: 'membros',
    label: 'Membros',
    icon: Users,
    disabled: false,
    href: '/settings?section=membros',
  },
  {
    id: 'organizacao',
    label: 'Organizacao',
    icon: Building2,
    disabled: true,
    href: '#',
  },
] as const

interface SettingsLayoutProps {
  readonly activeSection: string
  readonly children: React.ReactNode
}

export function SettingsLayout({
  activeSection,
  children,
}: SettingsLayoutProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configuracoes</h1>
        <p className="text-muted-foreground text-sm">
          Gerencie as configuracoes da sua organizacao.
        </p>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        <nav
          aria-label="Secoes de configuracao"
          className="flex flex-row gap-1 lg:w-56 lg:shrink-0 lg:flex-col"
        >
          {SETTINGS_SECTIONS.map((section) => (
            <SettingsNavItem
              key={section.id}
              section={section}
              isActive={section.id === activeSection}
            />
          ))}
        </nav>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}

interface SettingsNavItemProps {
  readonly section: SettingsSidebarItem
  readonly isActive: boolean
}

function SettingsNavItem({ section, isActive }: SettingsNavItemProps) {
  const Icon = section.icon

  if (section.disabled) {
    return (
      <span className="text-muted-foreground/50 flex min-h-10 cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm">
        <Icon className="size-4 shrink-0" />
        <span>{section.label}</span>
        <span className="text-muted-foreground/50 text-xs">(em breve)</span>
      </span>
    )
  }

  return (
    <Link
      href={section.href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
        isActive && 'bg-primary/10 text-primary',
        !isActive && 'text-muted-foreground hover:bg-muted'
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span>{section.label}</span>
    </Link>
  )
}
