'use client'

import { Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/menu'
import { Skeleton } from '@/components/ui/skeleton'

import { getInitials } from '@/lib/formatters'
import { formatDocument } from '@/lib/masks'
import type { ClientData } from '../lib/types'
import { TYPE_BADGE_VARIANT, TYPE_LABELS } from '../lib/constants'

interface ClientCardsProps {
  readonly data: ClientData[] | undefined
  readonly isLoading: boolean
  readonly onView: (id: string) => void
  readonly onEdit: (id: string) => void
  readonly onDelete: (id: string) => void
}

export function ClientCards({
  data,
  isLoading,
  onView,
  onEdit,
  onDelete,
}: ClientCardsProps) {
  if (isLoading) {
    return (
      <div className="space-y-3 md:hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (!data?.length) {
    return (
      <div className="flex h-32 items-center justify-center md:hidden">
        <p className="text-muted-foreground text-sm">
          Nenhum cliente encontrado.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3 md:hidden">
      {data.map((client) => (
        <div
          key={client.id}
          className="bg-card active:bg-muted/50 cursor-pointer space-y-3 rounded-lg border p-4"
          onClick={() => onView(client.id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onView(client.id)
            }
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                {getInitials(client.name)}
              </div>
              <span className="font-medium">{client.name}</span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label="Ações"
                  />
                }
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onView(client.id)}>
                  <Eye className="mr-2 size-4" />
                  Ver
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(client.id)}>
                  <Pencil className="mr-2 size-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onDelete(client.id)}
                >
                  <Trash2 className="mr-2 size-4" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <div className="text-muted-foreground text-xs">Documento</div>
              <div>{formatDocument(client.document)}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Tipo</div>
              <Badge variant={TYPE_BADGE_VARIANT[client.type]}>
                {TYPE_LABELS[client.type]}
              </Badge>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">E-mail</div>
              <div className="truncate">{client.email ?? '-'}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Telefone</div>
              <div>{client.phone ?? '-'}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
