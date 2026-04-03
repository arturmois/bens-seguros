'use client'

import { MoreHorizontal, Pencil, Power } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/menu'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDate } from '@/lib/formatters'

import type { InsurerItem } from '../hooks/use-insurers'

interface InsurersTableProps {
  readonly insurers: readonly InsurerItem[]
  readonly onEdit: (insurer: InsurerItem) => void
  readonly onToggleActive: (insurer: InsurerItem) => void
}

export function InsurersTable({
  insurers,
  onEdit,
  onToggleActive,
}: InsurersTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Código</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Atualizado em</TableHead>
          <TableHead className="w-12">
            <span className="sr-only">Ações</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {insurers.map((insurer) => (
          <TableRow
            key={insurer.id}
            className="cursor-pointer"
            tabIndex={0}
            onClick={() => onEdit(insurer)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onEdit(insurer)
              }
            }}
          >
            <TableCell className="font-medium">{insurer.name}</TableCell>
            <TableCell>{insurer.code ?? '-'}</TableCell>
            <TableCell>
              <Badge variant={insurer.active ? 'default' : 'secondary'}>
                {insurer.active ? 'Ativa' : 'Inativa'}
              </Badge>
            </TableCell>
            <TableCell>{formatDate(insurer.updatedAt)}</TableCell>
            <TableCell onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="hover:bg-accent inline-flex h-10 w-10 items-center justify-center rounded-md"
                  aria-label={`Ações da seguradora ${insurer.name}`}
                >
                  <MoreHorizontal className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(insurer)}>
                    <Pencil />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onToggleActive(insurer)}>
                    <Power />
                    {insurer.active ? 'Inativar' : 'Ativar'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function InsurersTableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Código</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Atualizado em</TableHead>
          <TableHead className="w-12" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 4 }, (_, index) => (
          <TableRow key={index}>
            <TableCell>
              <Skeleton className="h-4 w-36" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-20" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-16" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-24" />
            </TableCell>
            <TableCell>
              <Skeleton className="size-8" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
