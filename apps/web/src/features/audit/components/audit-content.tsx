'use client'

import { useState } from 'react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { AuditTable } from './audit-table'
import type { AuditLogFilters } from '../lib/constants'

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
  const [filters, setFilters] = useState<AuditLogFilters>({})

  function handleLoadMore(cursor: string) {
    setFilters((prev) => ({ ...prev, cursor }))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          aria-label="Filtrar por entidade"
          value={filters.entityType ?? 'ALL'}
          onValueChange={(v: string | null) => {
            setFilters((prev) => ({
              ...prev,
              entityType: v === 'ALL' ? undefined : (v ?? undefined),
              cursor: undefined,
            }))
          }}
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
          value={filters.action ?? 'ALL'}
          onValueChange={(v: string | null) => {
            setFilters((prev) => ({
              ...prev,
              action: v === 'ALL' ? undefined : (v ?? undefined),
              cursor: undefined,
            }))
          }}
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
      <AuditTable filters={filters} onLoadMore={handleLoadMore} />
    </div>
  )
}
