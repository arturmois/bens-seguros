'use client'

import { Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/menu'

import { getInitials } from '@/lib/formatters'
import type { ClientData } from '../lib/types'
import { TYPE_BADGE_VARIANT, TYPE_LABELS } from '../lib/constants'

interface ClientCardProps {
  readonly client: ClientData
  readonly onEdit: (id: string) => void
  readonly onDelete: (id: string) => void
}

export function ClientCard({ client, onEdit, onDelete }: ClientCardProps) {
  const router = useRouter()

  return (
    <div
      className="bg-card active:bg-muted/50 cursor-pointer space-y-3 rounded-lg border p-4"
      onClick={() => router.push(`/clients/${client.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          router.push(`/clients/${client.id}`)
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
            <DropdownMenuItem
              onClick={() => router.push(`/clients/${client.id}`)}
            >
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
          <div>{client.document}</div>
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
  )
}
