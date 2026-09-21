'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Search } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

import { useDebounce } from '@/hooks/use-debounce'
import { useListPolicies } from '@/api/endpoints/policies/policies'
import { ListPoliciesStatus } from '@/api/model/listPoliciesStatus'

interface PolicySearchProps {
  readonly value: string
  readonly onChange: (id: string) => void
}

export function PolicySearch({ value, onChange }: PolicySearchProps) {
  const [search, setSearch] = useState('')
  const [selectedLabel, setSelectedLabel] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const debouncedSearch = useDebounce(search, 300)
  const enabled = debouncedSearch.length >= 2
  const { data: results, isLoading } = useListPolicies(
    { search: debouncedSearch, limit: 10, status: ListPoliciesStatus.ACTIVE },
    {
      query: {
        enabled,
        select: (r) => r.data.data,
      },
    }
  )
  const policies = results ?? []
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target
      if (!(target instanceof Node)) return
      if (containerRef.current && !containerRef.current.contains(target)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  useEffect(() => {
    setHighlightedIndex(-1)
  }, [results])
  const selectPolicy = useCallback(
    (policy: (typeof policies)[number]) => {
      const label = `${policy.policyNumber} \u2014 ${policy.clientName ?? 'Sem cliente'}`
      onChange(policy.id)
      setSelectedLabel(label)
      setSearch(label)
      setShowResults(false)
    },
    [onChange, policies]
  )
  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showResults || policies.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev < policies.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : policies.length - 1))
    } else if (
      e.key === 'Enter' &&
      highlightedIndex >= 0 &&
      policies[highlightedIndex]
    ) {
      e.preventDefault()
      selectPolicy(policies[highlightedIndex])
    } else if (e.key === 'Escape') {
      setShowResults(false)
    }
  }
  const displayValue = value && selectedLabel ? selectedLabel : search
  const hasResults = showResults && policies.length > 0
  const hasNoResults =
    showResults && enabled && !isLoading && policies.length === 0
  const listId = 'policy-search-results'
  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={hasResults || undefined}
          aria-controls={hasResults ? listId : undefined}
          aria-activedescendant={
            hasResults && highlightedIndex >= 0 && policies[highlightedIndex]
              ? `policy-option-${policies[highlightedIndex].id}`
              : undefined
          }
          className="pl-9"
          placeholder="Buscar apólice por número ou cliente..."
          value={displayValue}
          onChange={(e) => {
            const val = e.target.value
            setSearch(val)
            setSelectedLabel('')
            onChange('')
            setShowResults(true)
          }}
          onFocus={() => {
            if (enabled) setShowResults(true)
          }}
          onKeyDown={handleKeyDown}
        />
        {isLoading && enabled && (
          <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>
      {hasResults && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label="Resultados de apólices"
          className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-lg border bg-popover p-1 shadow-lg/5"
        >
          {policies.map((policy, idx) => (
            <li
              key={policy.id}
              id={`policy-option-${policy.id}`}
              role="option"
              aria-selected={idx === highlightedIndex}
              className={`flex cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 text-sm ${
                idx === highlightedIndex ? 'bg-accent' : 'hover:bg-accent'
              }`}
              onClick={() => selectPolicy(policy)}
              onMouseEnter={() => setHighlightedIndex(idx)}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{policy.policyNumber}</p>
                <p className="truncate text-muted-foreground text-xs">
                  {policy.clientName ?? 'Sem cliente'}
                </p>
              </div>
              <Badge variant="outline" className="shrink-0 text-xs">
                {policy.branch}
              </Badge>
            </li>
          ))}
        </ul>
      )}
      {hasNoResults && (
        <div
          role="status"
          aria-live="polite"
          className="absolute z-50 mt-1 w-full rounded-lg border bg-popover px-3 py-4 text-center shadow-lg/5"
        >
          <p className="text-muted-foreground text-sm">
            Nenhuma apólice encontrada.
          </p>
        </div>
      )}
    </div>
  )
}
