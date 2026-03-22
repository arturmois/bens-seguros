'use client';

import { Building2, Radio, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

type SettingsSection = 'canais' | 'membros' | 'organizacao';

interface SettingsSidebarItem {
  readonly id: SettingsSection;
  readonly label: string;
  readonly icon: typeof Radio;
  readonly disabled: boolean;
}

const SETTINGS_SECTIONS: readonly SettingsSidebarItem[] = [
  { id: 'canais', label: 'Canais', icon: Radio, disabled: false },
  { id: 'membros', label: 'Membros', icon: Users, disabled: true },
  { id: 'organizacao', label: 'Organizacao', icon: Building2, disabled: true },
] as const;

interface SettingsLayoutProps {
  readonly children: React.ReactNode;
}

export function SettingsLayout({ children }: SettingsLayoutProps) {
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
              isActive={section.id === 'canais'}
            />
          ))}
        </nav>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

interface SettingsNavItemProps {
  readonly section: SettingsSidebarItem;
  readonly isActive: boolean;
}

function SettingsNavItem({ section, isActive }: SettingsNavItemProps) {
  const Icon = section.icon;

  return (
    <button
      type="button"
      disabled={section.disabled}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
        isActive && 'bg-primary/10 text-primary',
        !isActive && !section.disabled && 'text-muted-foreground hover:bg-muted',
        section.disabled && 'text-muted-foreground/50 cursor-not-allowed',
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span>{section.label}</span>
      {section.disabled && <span className="text-muted-foreground/50 text-xs">(em breve)</span>}
    </button>
  );
}
