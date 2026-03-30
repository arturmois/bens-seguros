'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { useDebounce } from '@/hooks/use-debounce'
import { api } from '@/lib/api-client'

import type { ClientData } from '@/features/clients/lib/constants'

interface ClientSearchProps {
  readonly value: string
  readonly onChange: (id: string) => void
}

export function ClientSearch({ value, onChange }: ClientSearchProps) {
  const [search, setSearch] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [selectedLabel, setSelectedLabel] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const debouncedSearch = useDebounce(search, 300)

  const { data, isLoading } = useQuery({
    queryKey: ['clients-search', debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch || debouncedSearch.length < 2) return []
      const res = await api.get<ClientData[]>(
        `/api/v1/clients?search=${encodeURIComponent(debouncedSearch)}&limit=10`
      )
      return res.data
    },
    enabled: debouncedSearch.length >= 2,
  })

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
  }, [data])

  const selectClient = useCallback(
    (client: ClientData) => {
      const label = `${client.name} \u2014 ${client.document}`
      onChange(client.id)
      setSelectedLabel(label)
      setSearch(label)
      setShowResults(false)
    },
    [onChange]
  )

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showResults || !data || data.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev < data.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : data.length - 1))
    } else if (
      e.key === 'Enter' &&
      highlightedIndex >= 0 &&
      data[highlightedIndex]
    ) {
      e.preventDefault()
      selectClient(data[highlightedIndex])
    } else if (e.key === 'Escape') {
      setShowResults(false)
    }
  }

  const displayValue = value && selectedLabel ? selectedLabel : search
  const hasResults = showResults && data && data.length > 0
  const hasNoResults =
    showResults &&
    debouncedSearch.length >= 2 &&
    !isLoading &&
    data &&
    data.length === 0

  return (
    <div className="relative" ref={containerRef}>
      <Input
        aria-label="Buscar cliente por nome ou documento"
        aria-autocomplete="list"
        aria-expanded={hasResults || undefined}
        aria-controls={hasResults ? 'client-search-results' : undefined}
        aria-activedescendant={
          hasResults && highlightedIndex >= 0 && data?.[highlightedIndex]
            ? `client-option-${data[highlightedIndex].id}`
            : undefined
        }
        role="combobox"
        placeholder="Buscar cliente por nome ou documento..."
        value={displayValue}
        onChange={(e) => {
          setSearch(e.target.value)
          setSelectedLabel('')
          onChange('')
          setShowResults(true)
        }}
        onFocus={() => {
          if (debouncedSearch.length >= 2) {
            setShowResults(true)
          }
        }}
        onKeyDown={handleKeyDown}
      />
      {isLoading && debouncedSearch.length >= 2 && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
        </div>
      )}
      {hasResults && (
        <ul
          id="client-search-results"
          ref={listRef}
          role="listbox"
          aria-label="Resultados de clientes"
          className="bg-popover absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border shadow-md"
        >
          {data.map((client, index) => (
            <li
              key={client.id}
              id={`client-option-${client.id}`}
              role="option"
              aria-selected={highlightedIndex === index}
              className={`w-full cursor-pointer px-3 py-2 text-left text-sm ${
                highlightedIndex === index ? 'bg-accent' : 'hover:bg-accent'
              }`}
              onClick={() => selectClient(client)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <span className="font-medium">{client.name}</span>
              <span className="text-muted-foreground ml-2">
                {client.document}
              </span>
            </li>
          ))}
        </ul>
      )}
      {hasNoResults && (
        <div
          role="status"
          aria-live="polite"
          className="bg-popover absolute z-50 mt-1 w-full rounded-lg border px-3 py-2 shadow-md"
        >
          <p className="text-muted-foreground text-sm">
            Nenhum cliente encontrado.
          </p>
        </div>
      )}
    </div>
  )
}
