'use client'

import Link from 'next/link'
import { Brain, Building2, Radio, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

type SettingsSection = 'channels' | 'agents' | 'members' | 'organization'

interface SettingsSidebarItem {
  readonly id: SettingsSection
  readonly label: string
  readonly icon: typeof Radio
  readonly disabled: boolean
  readonly href: string
}

const SETTINGS_SECTIONS: readonly SettingsSidebarItem[] = [
  {
    id: 'channels',
    label: 'Canais',
    icon: Radio,
    disabled: false,
    href: '/settings?section=channels',
  },
  {
    id: 'agents',
    label: 'Agentes IA',
    icon: Brain,
    disabled: false,
    href: '/settings?section=agents',
  },
  {
    id: 'members',
    label: 'Membros',
    icon: Users,
    disabled: false,
    href: '/settings?section=members',
  },
  {
    id: 'organization',
    label: 'Organização',
    icon: Building2,
    disabled: false,
    href: '/settings?section=organization',
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
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground text-sm">
          Gerencie as configurações da sua organização.
        </p>
      </div>
      <div className="flex flex-col gap-8 lg:flex-row">
        <nav
          aria-label="Seções de configuração"
          className="flex flex-row gap-1 overflow-x-auto lg:w-56 lg:shrink-0 lg:flex-col lg:overflow-x-visible"
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
      <span className="text-muted-foreground/50 flex min-h-10 cursor-not-allowed items-center gap-3 whitespace-nowrap rounded-md px-3 py-2 text-sm lg:whitespace-normal">
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
        'flex min-h-10 items-center gap-3 whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors lg:whitespace-normal',
        isActive && 'bg-primary/10 text-primary',
        !isActive && 'text-muted-foreground hover:bg-muted'
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span>{section.label}</span>
    </Link>
  )
}
