'use client'

import { MoreHorizontal, Users } from 'lucide-react'

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

import type { ClientData } from '../lib/constants'
import { TYPE_BADGE_VARIANT, TYPE_LABELS } from '../lib/constants'

export function ClientsTableHeader() {
  return (
    <TableHeader>
      <TableRow>
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
  return (
    <TableBody>
      {isLoading && <LoadingRows />}
      {!isLoading && data?.length === 0 && <EmptyRow />}
      {!isLoading &&
        data?.map((client) => (
          <ClientRow
            key={client.id}
            client={client}
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
  onClick,
  onEdit,
  onDelete,
}: {
  readonly client: ClientData
  readonly onClick: () => void
  readonly onEdit: () => void
  readonly onDelete: () => void
}) {
  return (
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
      <TableCell className="font-medium">{client.name}</TableCell>
      <TableCell className="hidden md:table-cell">{client.document}</TableCell>
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
  )
}

function LoadingRows() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <TableRow key={`skeleton-${i}`}>
          {Array.from({ length: 7 }).map((_, j) => (
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
      <TableCell colSpan={7} className="h-48 text-center">
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
