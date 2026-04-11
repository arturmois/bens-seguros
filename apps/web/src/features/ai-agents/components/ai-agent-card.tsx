'use client'

import { Copy, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/menu'

import type { AiAgentData } from '../types'
import { PROVIDER_LABELS } from '../lib/constants'

interface AiAgentCardProps {
  readonly agent: AiAgentData
  readonly onEdit: (agent: AiAgentData) => void
  readonly onDuplicate: (agent: AiAgentData) => void
  readonly onDelete: (agent: AiAgentData) => void
}

function formatChannelCount(count: number): string {
  if (count === 0) return 'Nenhum canal'
  if (count === 1) return '1 canal'
  return `${count} canais`
}

export function AiAgentCard({
  agent,
  onEdit,
  onDuplicate,
  onDelete,
}: AiAgentCardProps) {
  return (
    <div
      className="bg-card active:bg-muted/50 cursor-pointer space-y-3 rounded-lg border p-4"
      onClick={() => onEdit(agent)}
      role="button"
      tabIndex={0}
      aria-label={`Editar agente ${agent.name}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onEdit(agent)
        }
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-medium">{agent.name}</div>
          {agent.description && (
            <div className="text-muted-foreground truncate text-xs">
              {agent.description}
            </div>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label={`Ações do agente ${agent.name}`}
              />
            }
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(agent)}>
              <Pencil className="mr-2 size-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate(agent)}>
              <Copy className="mr-2 size-4" />
              Duplicar
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDelete(agent)}
            >
              <Trash2 className="mr-2 size-4" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <div className="text-muted-foreground text-xs">Provider</div>
          <Badge variant="secondary">
            {PROVIDER_LABELS[agent.provider] ?? agent.provider}
          </Badge>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Status</div>
          <Badge variant={agent.isActive ? 'default' : 'secondary'}>
            {agent.isActive ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>
        <div className="col-span-2">
          <div className="text-muted-foreground text-xs">Canais vinculados</div>
          <div>{formatChannelCount(agent.linkedChannelCount)}</div>
        </div>
      </div>
    </div>
  )
}
