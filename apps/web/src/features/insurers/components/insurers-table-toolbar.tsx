'use client'

import { Plus, Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import type { InsurerStatusFilter } from '../hooks/use-insurers'

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL' as const, label: 'Todas' },
  { value: 'ACTIVE' as const, label: 'Ativas' },
  { value: 'INACTIVE' as const, label: 'Inativas' },
] as const

const VALID_STATUS_FILTER_VALUES = STATUS_FILTER_OPTIONS.map((opt) => opt.value)

function isValidStatusFilter(value: string): value is InsurerStatusFilter {
  return VALID_STATUS_FILTER_VALUES.includes(value as InsurerStatusFilter)
}

interface InsurersTableToolbarProps {
  readonly search: string
  readonly status: InsurerStatusFilter
  readonly onSearchChange: (value: string) => void
  readonly onStatusChange: (value: InsurerStatusFilter) => void
  readonly onCreate: () => void
}

export function InsurersTableToolbar({
  search,
  status,
  onSearchChange,
  onStatusChange,
  onCreate,
}: InsurersTableToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            aria-label="Buscar seguradoras por nome ou código"
            placeholder="Buscar por nome ou código..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          aria-label="Filtrar seguradoras por status"
          value={status}
          onValueChange={(value: string | null) => {
            if (value && isValidStatusFilter(value)) onStatusChange(value)
          }}
          items={STATUS_FILTER_OPTIONS}
        >
          <SelectTrigger className="w-40">
            <SelectValue>
              {(value: string) => {
                const item = STATUS_FILTER_OPTIONS.find(
                  (opt) => opt.value === value
                )
                return item?.label ?? null
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={onCreate}>
          <Plus className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Nova seguradora</span>
        </Button>
      </div>
    </div>
  )
}
