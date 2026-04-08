'use client'

import { useState } from 'react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import type { AuditLogFilters } from '../lib/constants'
import { AuditTable } from './audit-table'

const ENTITY_TYPE_OPTIONS = [
  { value: 'ALL', label: 'Todas entidades' },
  { value: 'Client', label: 'Cliente' },
  { value: 'Proposal', label: 'Proposta' },
  { value: 'Policy', label: 'Apólice' },
  { value: 'Claim', label: 'Sinistro' },
  { value: 'Commission', label: 'Comissão' },
] as const

const ACTION_OPTIONS = [
  { value: 'ALL', label: 'Todas ações' },
  { value: 'CREATE', label: 'Criar' },
  { value: 'UPDATE', label: 'Atualizar' },
  { value: 'DELETE', label: 'Excluir' },
  { value: 'APPROVE', label: 'Aprovar' },
  { value: 'REJECT', label: 'Rejeitar' },
] as const

export function AuditContent() {
  const [entityType, setEntityType] = useState<string | undefined>(undefined)
  const [action, setAction] = useState<string | undefined>(undefined)
  const [cursors, setCursors] = useState<string[]>([])

  const currentCursor = cursors.at(-1)

  const filters: AuditLogFilters = {
    entityType,
    action,
    cursor: currentCursor,
  }

  function handleEntityTypeChange(v: string | null) {
    setEntityType(v === 'ALL' ? undefined : (v ?? undefined))
    setCursors([])
  }

  function handleActionChange(v: string | null) {
    setAction(v === 'ALL' ? undefined : (v ?? undefined))
    setCursors([])
  }

  function handleNextPage(nextCursor: string) {
    setCursors((prev) => [...prev, nextCursor])
  }

  function handlePreviousPage() {
    setCursors((prev) => prev.slice(0, -1))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          aria-label="Filtrar por entidade"
          value={entityType ?? 'ALL'}
          onValueChange={handleEntityTypeChange}
          items={[...ENTITY_TYPE_OPTIONS]}
        >
          <SelectTrigger size="sm" className="w-48">
            <SelectValue>
              {(value: string) => {
                const item = ENTITY_TYPE_OPTIONS.find((o) => o.value === value)
                return item?.label ?? null
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {ENTITY_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          aria-label="Filtrar por ação"
          value={action ?? 'ALL'}
          onValueChange={handleActionChange}
          items={[...ACTION_OPTIONS]}
        >
          <SelectTrigger size="sm" className="w-44">
            <SelectValue>
              {(value: string) => {
                const item = ACTION_OPTIONS.find((o) => o.value === value)
                return item?.label ?? null
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {ACTION_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <AuditTable
        filters={filters}
        hasPreviousPage={cursors.length > 0}
        onNextPage={handleNextPage}
        onPreviousPage={handlePreviousPage}
      />
    </div>
  )
}
