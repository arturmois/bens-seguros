'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Shield } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useDebounce } from '@/hooks/use-debounce'

import { usePolicies } from '../hooks/use-policies'
import type { PolicyData, PolicyStatus } from '../types'
import { CancelPolicyDialog } from './cancel-policy-dialog'
import { PoliciesTableToolbar } from './policies-table-toolbar'
import { PolicyTableRow } from './policy-table-row'

export function PoliciesTable() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<PolicyStatus | 'ALL'>('ALL')
  const [cursor, setCursor] = useState<string | undefined>(undefined)
  const [cancelTarget, setCancelTarget] = useState<PolicyData | null>(null)

  const debouncedSearch = useDebounce(search, 300)

  const { data, isLoading, isError, refetch } = usePolicies({
    search: debouncedSearch || undefined,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    cursor,
  })

  const policies = data?.data ?? []
  const meta = data?.meta

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setCursor(undefined)
  }

  const handleStatusFilterChange = (value: PolicyStatus | 'ALL') => {
    setStatusFilter(value)
    setCursor(undefined)
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <p className="text-destructive text-sm">Erro ao carregar apólices.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  return (
    <>
      <PoliciesTableToolbar
        search={search}
        statusFilter={statusFilter}
        debouncedSearch={debouncedSearch}
        onSearchChange={handleSearchChange}
        onStatusFilterChange={handleStatusFilterChange}
      />

      {isLoading ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nº Apólice</TableHead>
              <TableHead className="hidden md:table-cell">Ramo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden text-right md:table-cell">
                Valor
              </TableHead>
              <TableHead className="hidden md:table-cell">Vigência</TableHead>
              <TableHead className="hidden lg:table-cell">Criado em</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={`skeleton-${String(i)}`}>
                {Array.from({ length: 7 }).map((_, j) => (
                  <TableCell key={`skeleton-${String(i)}-${String(j)}`}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : policies.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <Shield className="text-muted-foreground size-10" />
          <div>
            <p className="font-medium">Nenhuma apólice encontrada</p>
            <p className="text-muted-foreground mt-1 text-sm">
              As apólices serão criadas a partir de propostas aprovadas.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/proposals">Ver propostas</Link>
          </Button>
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº Apólice</TableHead>
                <TableHead>Ramo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Vigência</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.map((policy: PolicyData) => (
                <PolicyTableRow
                  key={policy.id}
                  policy={policy}
                  onRowClick={(id) => router.push(`/policies/${id}`)}
                  onCancelClick={setCancelTarget}
                />
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!cursor}
              onClick={() => setCursor(undefined)}
            >
              <ChevronLeft className="mr-1 size-4" /> Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!meta?.hasMore}
              onClick={() => {
                if (meta?.nextCursor) setCursor(meta.nextCursor)
              }}
            >
              Próximo <ChevronRight className="ml-1 size-4" />
            </Button>
          </div>
        </>
      )}

      <CancelPolicyDialog
        policy={cancelTarget}
        onClose={() => setCancelTarget(null)}
      />
    </>
  )
}
