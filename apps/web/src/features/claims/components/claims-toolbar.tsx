'use client'

import Link from 'next/link'
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

import { CLAIM_PRIORITY_OPTIONS, CLAIM_STATUS_OPTIONS } from '../lib/constants'

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'Todos os status' },
  ...CLAIM_STATUS_OPTIONS,
]
const PRIORITY_FILTER_OPTIONS = [
  { value: 'ALL', label: 'Todas as prioridades' },
  ...CLAIM_PRIORITY_OPTIONS,
]

interface ClaimsToolbarProps {
  readonly search: string
  readonly onSearchChange: (value: string) => void
  readonly statusFilter: string
  readonly onStatusFilterChange: (value: string) => void
  readonly priorityFilter: string
  readonly onPriorityFilterChange: (value: string) => void
}

export function ClaimsToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
}: ClaimsToolbarProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            aria-label="Buscar sinistros por numero, cliente ou apolice"
            placeholder="Buscar sinistro..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button asChild>
          <Link href="/claims/new">
            <Plus className="mr-2 h-4 w-4" />
            Novo Sinistro
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            if (v !== null) onStatusFilterChange(v)
          }}
          items={STATUS_FILTER_OPTIONS}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={priorityFilter}
          onValueChange={(v) => {
            if (v !== null) onPriorityFilterChange(v)
          }}
          items={PRIORITY_FILTER_OPTIONS}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_FILTER_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
