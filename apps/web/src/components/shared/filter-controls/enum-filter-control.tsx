'use client'

import { useMemo, useState } from 'react'
import { Check, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FilterOption } from '../filter-types'

interface EnumFilterControlProps {
  readonly label: string
  readonly options: readonly FilterOption[]
  readonly isLoadingOptions?: boolean
  readonly value: readonly string[] | undefined
  readonly onCommit: (next: readonly string[] | undefined) => void
  readonly onClose: () => void
}

const SEARCH_THRESHOLD = 8

export function EnumFilterControl({
  label,
  options,
  isLoadingOptions = false,
  value,
  onCommit,
  onClose,
}: EnumFilterControlProps) {
  const [draft, setDraft] = useState<readonly string[]>(value ?? [])
  const [query, setQuery] = useState('')
  const showSearch = options.length > SEARCH_THRESHOLD
  const filtered = useMemo(() => {
    if (!query.trim()) return options
    const q = query.trim().toLowerCase()
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, query])
  function toggle(optionValue: string) {
    setDraft((current) =>
      current.includes(optionValue)
        ? current.filter((v) => v !== optionValue)
        : [...current, optionValue]
    )
  }
  function handleApply() {
    onCommit(draft.length > 0 ? draft : undefined)
    onClose()
  }
  function handleClear() {
    setDraft([])
  }
  return (
    <div className="flex w-full flex-col" data-slot="enum-filter-control">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="font-medium text-sm">{label}</span>
        <span className="text-muted-foreground text-xs">
          {draft.length > 0
            ? `${draft.length} selecionado${draft.length > 1 ? 's' : ''}`
            : ''}
        </span>
      </div>
      {showSearch && (
        <div className="border-b px-2 py-1.5">
          <div className="relative">
            <Search className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              className="h-7 w-full rounded-sm bg-transparent pl-7 text-xs outline-none"
              placeholder="Buscar valor..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      )}
      <div className="max-h-64 overflow-y-auto py-1">
        {isLoadingOptions && (
          <div className="px-3 py-2 text-muted-foreground text-xs">
            Carregando...
          </div>
        )}
        {!isLoadingOptions && filtered.length === 0 && (
          <div className="px-3 py-2 text-muted-foreground text-xs">
            Nenhum valor encontrado
          </div>
        )}
        {!isLoadingOptions &&
          filtered.map((option) => {
            const checked = draft.includes(option.value)
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggle(option.value)}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm',
                  'hover:bg-accent'
                )}
              >
                <span
                  className={cn(
                    'flex size-4 items-center justify-center rounded-sm border border-input',
                    checked &&
                      'border-primary bg-primary text-primary-foreground'
                  )}
                  aria-hidden
                >
                  {checked && <Check className="size-3" />}
                </span>
                <span className="flex-1">{option.label}</span>
              </button>
            )
          })}
      </div>
      <div className="flex items-center justify-between border-t px-3 py-2 text-xs">
        <button
          type="button"
          onClick={handleClear}
          className="text-muted-foreground hover:text-foreground"
        >
          Limpar
        </button>
        <button
          type="button"
          onClick={handleApply}
          className="font-medium text-primary hover:underline"
        >
          Aplicar
        </button>
      </div>
    </div>
  )
}
