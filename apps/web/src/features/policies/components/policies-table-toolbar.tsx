'use client'

import { Search } from 'lucide-react'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import type { PolicyStatus } from '../types'
import { POLICY_STATUS_LABELS, POLICY_STATUSES } from '../types'
import { PolicyExportButton } from './policy-export-button'

interface PoliciesTableToolbarProps {
  readonly search: string
  readonly statusFilter: PolicyStatus | 'ALL'
  readonly debouncedSearch: string
  readonly onSearchChange: (value: string) => void
  readonly onStatusFilterChange: (value: PolicyStatus | 'ALL') => void
}

export function PoliciesTableToolbar({
  search,
  statusFilter,
  debouncedSearch,
  onSearchChange,
  onStatusFilterChange,
}: PoliciesTableToolbarProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1">
        <Search className="text-muted-foreground absolute left-3 top-2.5 size-4" />
        <Input
          aria-label="Buscar apólices por número ou cliente"
          placeholder="Buscar por número ou cliente..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select
        value={statusFilter}
        onValueChange={(v) => {
          if (v === null) return
          const validStatuses: readonly string[] = POLICY_STATUSES
          onStatusFilterChange(
            validStatuses.includes(v) ? (v as PolicyStatus) : 'ALL'
          )
        }}
        items={[
          { value: 'ALL', label: 'Todos' },
          ...POLICY_STATUSES.map((s) => ({
            value: s,
            label: POLICY_STATUS_LABELS[s],
          })),
        ]}
      >
        <SelectTrigger className="w-40">
          <SelectValue>
            {(value: string) => {
              if (value === 'ALL') return 'Todos'
              return POLICY_STATUS_LABELS[value as PolicyStatus] ?? null
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Todos</SelectItem>
          {POLICY_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {POLICY_STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <PolicyExportButton
        filters={{
          search: debouncedSearch || undefined,
          status: statusFilter === 'ALL' ? undefined : statusFilter,
        }}
      />
    </div>
  )
}
