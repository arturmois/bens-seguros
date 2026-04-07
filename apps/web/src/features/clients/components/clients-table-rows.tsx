'use client'

import { useState } from 'react'

import { Users } from 'lucide-react'

import { Skeleton } from '@/components/ui/skeleton'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import type { ClientData } from '../lib/constants'
import { ClientRow } from './client-row'

export function ClientsTableHeader() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead className="w-10 md:hidden" />
        <TableHead>Nome</TableHead>
        <TableHead className="hidden md:table-cell">Documento</TableHead>
        <TableHead>Tipo</TableHead>
        <TableHead className="hidden md:table-cell">E-mail</TableHead>
        <TableHead className="hidden md:table-cell">Telefone</TableHead>
        <TableHead className="hidden lg:table-cell">Criado em</TableHead>
        <TableHead className="w-12" />
      </TableRow>
    </TableHeader>
  )
}

export function ClientsTableBody({
  data,
  isLoading,
  onRowClick,
  onEdit,
  onDelete,
}: {
  readonly data: ClientData[] | undefined
  readonly isLoading: boolean
  readonly onRowClick: (id: string) => void
  readonly onEdit: (client: ClientData) => void
  readonly onDelete: (id: string) => void
}) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  function toggleRow(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <TableBody>
      {isLoading && <LoadingRows />}
      {!isLoading && data?.length === 0 && <EmptyRow />}
      {!isLoading &&
        data?.map((client) => (
          <ClientRow
            key={client.id}
            client={client}
            isExpanded={expandedRows.has(client.id)}
            onToggleExpand={() => toggleRow(client.id)}
            onClick={() => onRowClick(client.id)}
            onEdit={() => onEdit(client)}
            onDelete={() => onDelete(client.id)}
          />
        ))}
    </TableBody>
  )
}

function LoadingRows() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <TableRow key={`skeleton-${i}`}>
          {Array.from({ length: 8 }).map((_, j) => (
            <TableCell key={`skeleton-${i}-${j}`}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

function EmptyRow() {
  return (
    <TableRow>
      <TableCell colSpan={8} className="h-48 text-center">
        <div className="flex flex-col items-center justify-center gap-3">
          <Users className="text-muted-foreground size-10" />
          <div>
            <p className="font-medium">Nenhum cliente encontrado</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Cadastre seu primeiro cliente para começar.
            </p>
          </div>
        </div>
      </TableCell>
    </TableRow>
  )
}
