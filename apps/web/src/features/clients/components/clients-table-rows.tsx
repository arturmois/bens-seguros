'use client'

import { useState } from 'react'

import { ChevronDown, MoreHorizontal, Users } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/menu'
import { cn } from '@/lib/utils'

import type { ClientData } from '../lib/constants'
import { TYPE_BADGE_VARIANT, TYPE_LABELS } from '../lib/constants'

// Mobile-visible columns: chevron (md:hidden) + Nome + Tipo + Actions = 4
const MOBILE_COLSPAN = 4

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

function ClientRow({
  client,
  isExpanded,
  onToggleExpand,
  onClick,
  onEdit,
  onDelete,
}: {
  readonly client: ClientData
  readonly isExpanded: boolean
  readonly onToggleExpand: () => void
  readonly onClick: () => void
  readonly onEdit: () => void
  readonly onDelete: () => void
}) {
  return (
    <>
      <TableRow
        className="cursor-pointer"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onClick()
          }
        }}
      >
        <TableCell className="w-10 md:hidden">
          <button
            type="button"
            className="hover:bg-muted flex h-8 w-8 items-center justify-center rounded-md"
            onClick={(e) => {
              e.stopPropagation()
              onToggleExpand()
            }}
            aria-label={isExpanded ? 'Recolher detalhes' : 'Expandir detalhes'}
          >
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform',
                isExpanded && 'rotate-180'
              )}
            />
          </button>
        </TableCell>
        <TableCell className="font-medium">{client.name}</TableCell>
        <TableCell className="hidden md:table-cell">
          {client.document}
        </TableCell>
        <TableCell>
          <Badge variant={TYPE_BADGE_VARIANT[client.type]}>
            {TYPE_LABELS[client.type]}
          </Badge>
        </TableCell>
        <TableCell className="hidden md:table-cell">
          {client.email ?? '-'}
        </TableCell>
        <TableCell className="hidden md:table-cell">
          {client.phone ?? '-'}
        </TableCell>
        <TableCell className="hidden lg:table-cell">
          {new Date(client.createdAt).toLocaleDateString('pt-BR')}
        </TableCell>
        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger
              className="hover:bg-accent inline-flex h-10 w-10 items-center justify-center rounded-md"
              aria-haspopup="menu"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Ações do cliente {client.name}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit()
                }}
              >
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                }}
              >
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
      {isExpanded && (
        <TableRow className="bg-muted/30 md:hidden">
          <TableCell colSpan={MOBILE_COLSPAN}>
            <div className="space-y-2 py-2 text-sm">
              <div>
                <span className="text-muted-foreground text-xs">
                  Documento:{' '}
                </span>
                <span>{client.document}</span>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">E-mail: </span>
                <span>{client.email ?? '-'}</span>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">
                  Telefone:{' '}
                </span>
                <span>{client.phone ?? '-'}</span>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">
                  Criado em:{' '}
                </span>
                <span>
                  {new Date(client.createdAt).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
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
