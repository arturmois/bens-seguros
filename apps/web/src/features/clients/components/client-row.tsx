import { ChevronDown, MoreHorizontal } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TableCell, TableRow } from '@/components/ui/table'
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

export function ClientRow({
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
          <Button
            variant="ghost"
            size="icon-sm"
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
          </Button>
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
      {isExpanded && <ClientRowExpandedDetails client={client} />}
    </>
  )
}

function ClientRowExpandedDetails({
  client,
}: {
  readonly client: {
    document: string
    email?: string | null
    phone?: string | null
    createdAt: string
  }
}) {
  return (
    <TableRow className="bg-muted/30 md:hidden">
      <TableCell colSpan={MOBILE_COLSPAN}>
        <div className="space-y-2 py-2 text-sm">
          <div>
            <span className="text-muted-foreground text-xs">Documento: </span>
            <span>{client.document}</span>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">E-mail: </span>
            <span>{client.email ?? '-'}</span>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Telefone: </span>
            <span>{client.phone ?? '-'}</span>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Criado em: </span>
            <span>
              {new Date(client.createdAt).toLocaleDateString('pt-BR')}
            </span>
          </div>
        </div>
      </TableCell>
    </TableRow>
  )
}
