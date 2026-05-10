'use client'

import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { listContacts } from '@/api/endpoints/contacts/contacts'
import { useDebounce } from '@/hooks/use-debounce'

import { CONTACT_SOURCE_LABELS } from '../lib/constants'
import type { ContactListItem } from '../lib/types'

interface ContactSearchProps {
  readonly value: string
  readonly onChange: (id: string) => void
  readonly onCreateClick?: () => void
  readonly placeholder?: string
}

const MIN_SEARCH_LENGTH = 2
const SEARCH_LIMIT = 10
const DEBOUNCE_MS = 300

function buildLabel(contact: ContactListItem): string {
  const detail = contact.phone ?? contact.email ?? ''
  return detail ? `${contact.name} — ${detail}` : contact.name
}

export function ContactSearch({
  value,
  onChange,
  onCreateClick,
  placeholder = 'Buscar contato por nome, telefone ou email...',
}: ContactSearchProps) {
  const [search, setSearch] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [selectedLabel, setSelectedLabel] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const debouncedSearch = useDebounce(search, DEBOUNCE_MS)
  const { data, isLoading } = useQuery({
    queryKey: ['contacts-search', debouncedSearch],
    enabled: debouncedSearch.length >= MIN_SEARCH_LENGTH,
    queryFn: async () => {
      const response = await listContacts({
        search: debouncedSearch,
        limit: SEARCH_LIMIT,
      })
      const body = response.data
      if ('data' in body && Array.isArray(body.data)) return body.data
      return [] as ContactListItem[]
    },
  })
  const selectContact = useCallback(
    (contact: ContactListItem) => {
      onChange(contact.id)
      setSelectedLabel(buildLabel(contact))
      setSearch(buildLabel(contact))
      setShowResults(false)
    },
    [onChange]
  )
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
  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!showResults || !data || data.length === 0) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlightedIndex((prev) => (prev < data.length - 1 ? prev + 1 : 0))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : data.length - 1))
      return
    }
    if (
      event.key === 'Enter' &&
      highlightedIndex >= 0 &&
      data[highlightedIndex]
    ) {
      event.preventDefault()
      selectContact(data[highlightedIndex])
      return
    }
    if (event.key === 'Escape') {
      setShowResults(false)
    }
  }
  const displayValue = value && selectedLabel ? selectedLabel : search
  const hasResults = showResults && data && data.length > 0
  const hasNoResults =
    showResults &&
    debouncedSearch.length >= MIN_SEARCH_LENGTH &&
    !isLoading &&
    data &&
    data.length === 0
  return (
    <div className="relative" ref={containerRef}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            role="combobox"
            aria-label="Buscar contato"
            aria-autocomplete="list"
            aria-expanded={hasResults || undefined}
            aria-controls={hasResults ? 'contact-search-results' : undefined}
            aria-activedescendant={
              hasResults && highlightedIndex >= 0 && data?.[highlightedIndex]
                ? `contact-option-${data[highlightedIndex].id}`
                : undefined
            }
            placeholder={placeholder}
            value={displayValue}
            onChange={(event) => {
              setSearch(event.target.value)
              setSelectedLabel('')
              onChange('')
              setShowResults(true)
            }}
            onFocus={() => {
              if (debouncedSearch.length >= MIN_SEARCH_LENGTH) {
                setShowResults(true)
              }
            }}
            onKeyDown={handleKeyDown}
          />
          {isLoading && debouncedSearch.length >= MIN_SEARCH_LENGTH && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="text-muted-foreground size-4 animate-spin" />
            </div>
          )}
        </div>
        {onCreateClick && (
          <Button type="button" variant="outline" onClick={onCreateClick}>
            Novo
          </Button>
        )}
      </div>
      {hasResults && (
        <ul
          id="contact-search-results"
          role="listbox"
          aria-label="Resultados de contatos"
          className="bg-popover absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border shadow-md"
        >
          {data.map((contact, index) => (
            <li
              key={contact.id}
              id={`contact-option-${contact.id}`}
              role="option"
              aria-selected={highlightedIndex === index}
              className={`cursor-pointer px-3 py-2 text-sm ${
                highlightedIndex === index ? 'bg-accent' : 'hover:bg-accent'
              }`}
              onClick={() => selectContact(contact)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <div className="font-medium">{contact.name}</div>
              <div className="text-muted-foreground text-xs">
                {contact.phone ?? contact.email ?? '—'} {' · '}
                {CONTACT_SOURCE_LABELS[contact.source]}
              </div>
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
            Nenhum contato encontrado.
          </p>
        </div>
      )}
    </div>
  )
}
