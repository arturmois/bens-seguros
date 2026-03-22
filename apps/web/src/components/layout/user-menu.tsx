'use client'

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { cn } from '@/lib/utils'
import {
  ChevronsUpDown,
  LogOut,
  Monitor,
  Moon,
  Settings,
  Sun,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import { useState } from 'react'

interface UserMenuProps {
  collapsed: boolean
}

const THEME_OPTIONS = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Escuro', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Monitor },
] as const

function getUserInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .filter((w) => w.length > 0)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export function UserMenu({ collapsed }: UserMenuProps) {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)

  if (!user) return null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label="Menu do usuário"
        className={cn(
          'hover:bg-muted flex w-full items-center gap-3 border-t px-4 py-3 text-left transition-colors',
          collapsed && 'justify-center px-0'
        )}
      >
        <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
          {getUserInitials(user.name)}
        </div>
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{user.name}</div>
              <div className="text-muted-foreground truncate text-xs">
                {user.email}
              </div>
            </div>
            <ChevronsUpDown className="text-muted-foreground size-4 shrink-0" />
          </>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-0"
        side={collapsed ? 'right' : 'top'}
        align={collapsed ? 'end' : 'center'}
        sideOffset={8}
      >
        <div className="border-b px-4 py-3">
          <div className="truncate text-sm font-medium">{user.name}</div>
          <div className="text-muted-foreground truncate text-xs">
            {user.email}
          </div>
        </div>

        <div className="p-1">
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="hover:bg-muted flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors"
          >
            <Settings className="size-4" />
            <span>Configurações</span>
          </Link>
        </div>

        <div className="border-t px-4 py-3">
          <p className="text-muted-foreground mb-2 text-xs font-medium">Tema</p>
          <div
            className="flex gap-1"
            role="radiogroup"
            aria-label="Selecionar tema"
          >
            {THEME_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={theme === option.value}
                aria-label={option.label}
                onClick={() => setTheme(option.value)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors',
                  theme === option.value
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-muted-foreground'
                )}
              >
                <option.icon className="size-3.5" />
              </button>
            ))}
          </div>
        </div>

        <div className="border-t p-1">
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              logout.mutate()
            }}
            className="text-destructive hover:bg-muted flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors"
          >
            <LogOut className="size-4" />
            <span>Sair</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
