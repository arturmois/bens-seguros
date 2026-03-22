'use client'

import { useState } from 'react'

import { AuditTable } from './audit-table'
import type { AuditLogFilters } from '../types'

export function AuditContent() {
  const [filters, setFilters] = useState<AuditLogFilters>({})

  function handleLoadMore(cursor: string) {
    setFilters((prev) => ({ ...prev, cursor }))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="border-input bg-background h-8 rounded-md border px-2 text-sm"
          value={filters.entityType ?? ''}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              entityType: e.target.value || undefined,
              cursor: undefined,
            }))
          }
        >
          <option value="">Todas entidades</option>
          <option value="Client">Cliente</option>
          <option value="Proposal">Proposta</option>
          <option value="Policy">Apolice</option>
          <option value="Claim">Sinistro</option>
          <option value="Commission">Comissao</option>
        </select>
        <select
          className="border-input bg-background h-8 rounded-md border px-2 text-sm"
          value={filters.action ?? ''}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              action: e.target.value || undefined,
              cursor: undefined,
            }))
          }
        >
          <option value="">Todas acoes</option>
          <option value="CREATE">Criar</option>
          <option value="UPDATE">Atualizar</option>
          <option value="DELETE">Excluir</option>
          <option value="APPROVE">Aprovar</option>
          <option value="REJECT">Rejeitar</option>
        </select>
      </div>
      <AuditTable filters={filters} onLoadMore={handleLoadMore} />
    </div>
  )
}
