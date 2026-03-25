'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  FilePlus,
  LayoutDashboard,
  Search,
  Settings,
  UserPlus,
  Users,
  FileText,
  Shield,
  AlertTriangle,
} from 'lucide-react'
import {
  CommandDialog,
  CommandDialogPopup,
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandGroupLabel,
  CommandItem,
  CommandPanel,
  CommandEmpty,
  CommandFooter,
} from '@/components/ui/command'
import { useGlobalSearch } from '@/hooks/use-global-search'
import type { GlobalSearchResults } from './command-palette.types'

const QUICK_ACTIONS = [
  { label: 'Novo Cliente', icon: UserPlus, route: '/clients/new' },
  { label: 'Nova Proposta', icon: FilePlus, route: '/proposals/new' },
  { label: 'Dashboard', icon: LayoutDashboard, route: '/' },
  { label: 'Configurações', icon: Settings, route: '/settings' },
] as const

const ENTITY_CONFIG = {
  clients: { label: 'Clientes', icon: Users, prefix: '/clients' },
  proposals: { label: 'Propostas', icon: FileText, prefix: '/proposals' },
  policies: { label: 'Apólices', icon: Shield, prefix: '/policies' },
  claims: { label: 'Sinistros', icon: AlertTriangle, prefix: '/claims' },
} as const

type EntityKey = keyof typeof ENTITY_CONFIG

function QuickActionsGroup({
  onSelect,
}: {
  onSelect: (route: string) => void
}) {
  return (
    <CommandGroup>
      <CommandGroupLabel>Ações rápidas</CommandGroupLabel>
      {QUICK_ACTIONS.map((action) => (
        <CommandItem
          key={action.route}
          onClick={() => onSelect(action.route)}
          value={action.label}
        >
          <action.icon className="mr-2 size-4 shrink-0" />
          {action.label}
        </CommandItem>
      ))}
    </CommandGroup>
  )
}

function getResultLabel(key: EntityKey, item: Record<string, unknown>): string {
  if (key === 'clients') return item.name as string
  if (key === 'proposals')
    return `${String(item.branch)} — ${String(item.clientName)}`
  if (key === 'policies')
    return `${String(item.policyNumber)} — ${String(item.clientName)}`
  return `#${String(item.claimNumber)} — ${String(item.clientName)}`
}

function SearchResultsGroups({
  results,
  onSelect,
}: {
  results: GlobalSearchResults
  onSelect: (route: string) => void
}) {
  const entityKeys = Object.keys(ENTITY_CONFIG) as readonly EntityKey[]

  return (
    <>
      {entityKeys.map((key) => {
        const items = results[key]
        if (items.length === 0) return null
        const config = ENTITY_CONFIG[key]
        const Icon = config.icon

        return (
          <CommandGroup key={key}>
            <CommandGroupLabel>{config.label}</CommandGroupLabel>
            {items.map((item) => {
              const record = item as unknown as Record<string, unknown>
              const label = getResultLabel(key, record)
              return (
                <CommandItem
                  key={item.id}
                  onClick={() => onSelect(`${config.prefix}/${item.id}`)}
                  value={`${config.label} ${label}`}
                >
                  <Icon className="mr-2 size-4 shrink-0" />
                  <span className="truncate">{label}</span>
                </CommandItem>
              )
            })}
          </CommandGroup>
        )
      })}
    </>
  )
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const router = useRouter()
  const { results, isLoading } = useGlobalSearch(query)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSelect = useCallback(
    (route: string) => {
      setOpen(false)
      setQuery('')
      router.push(route)
    },
    [router]
  )

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) setQuery('')
  }, [])

  const hasQuery = query.trim().length > 0
  const hasResults =
    results &&
    (results.clients.length > 0 ||
      results.proposals.length > 0 ||
      results.policies.length > 0 ||
      results.claims.length > 0)

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange}>
      <CommandDialogPopup>
        <Command mode="none">
          <CommandInput
            placeholder="Buscar clientes, propostas, apólices..."
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
          />
          <CommandPanel>
            <CommandList>
              {!hasQuery && <QuickActionsGroup onSelect={handleSelect} />}
              {hasQuery && results && (
                <SearchResultsGroups
                  results={results}
                  onSelect={handleSelect}
                />
              )}
              {hasQuery && !isLoading && !hasResults && (
                <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
              )}
              {hasQuery && isLoading && (
                <div className="text-muted-foreground py-6 text-center text-sm">
                  Buscando...
                </div>
              )}
            </CommandList>
          </CommandPanel>
          <CommandFooter>
            <div className="flex gap-4">
              <span>↑↓ navegar</span>
              <span>↵ abrir</span>
              <span>esc fechar</span>
            </div>
            {isLoading && (
              <Search className="text-muted-foreground size-4 animate-pulse" />
            )}
          </CommandFooter>
        </Command>
      </CommandDialogPopup>
    </CommandDialog>
  )
}
