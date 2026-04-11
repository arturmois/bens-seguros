'use client'

import { MoreHorizontal, Pencil, Power } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/menu'
import { formatDate } from '@/lib/formatters'

import type { InsurerData } from '../lib/types'

interface InsurerCardProps {
  readonly insurer: InsurerData
  readonly onEdit: (insurer: InsurerData) => void
  readonly onToggleActive: (insurer: InsurerData) => void
}

export function InsurerCard({
  insurer,
  onEdit,
  onToggleActive,
}: InsurerCardProps) {
  return (
    <div
      className="bg-card active:bg-muted/50 cursor-pointer space-y-3 rounded-lg border p-4"
      onClick={() => onEdit(insurer)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onEdit(insurer)
        }
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-medium">{insurer.name}</div>
          <div className="text-muted-foreground text-xs">
            {insurer.code ?? 'Sem código'}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label={`Ações da seguradora ${insurer.name}`}
              />
            }
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(insurer)}>
              <Pencil className="mr-2 size-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToggleActive(insurer)}>
              <Power className="mr-2 size-4" />
              {insurer.active ? 'Inativar' : 'Ativar'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <div className="text-muted-foreground text-xs">Status</div>
          <Badge variant={insurer.active ? 'default' : 'secondary'}>
            {insurer.active ? 'Ativa' : 'Inativa'}
          </Badge>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Atualizado em</div>
          <div>{formatDate(insurer.updatedAt)}</div>
        </div>
      </div>
    </div>
  )
}
