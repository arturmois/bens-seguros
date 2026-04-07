'use client'

import { Copy, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'

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

import type { AiAgentData } from '../types'

const PROVIDER_LABELS: Record<string, string> = {
  claude: 'Claude',
  openai: 'OpenAI',
}

interface AiAgentsTableProps {
  readonly agents: readonly AiAgentData[]
  readonly onEdit: (agent: AiAgentData) => void
  readonly onDuplicate: (agent: AiAgentData) => void
  readonly onDelete: (agent: AiAgentData) => void
}

export function AiAgentsTable({
  agents,
  onEdit,
  onDuplicate,
  onDelete,
}: AiAgentsTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Provider</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Canais</TableHead>
            <TableHead className="w-12">
              <span className="sr-only">Ações</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {agents.map((agent) => (
            <AgentRow
              key={agent.id}
              agent={agent}
              onEdit={onEdit}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

interface AgentRowProps {
  readonly agent: AiAgentData
  readonly onEdit: (agent: AiAgentData) => void
  readonly onDuplicate: (agent: AiAgentData) => void
  readonly onDelete: (agent: AiAgentData) => void
}

function AgentRow({ agent, onEdit, onDuplicate, onDelete }: AgentRowProps) {
  const channelCountText =
    agent.linkedChannelCount === 0
      ? 'Nenhum'
      : agent.linkedChannelCount === 1
        ? '1 canal'
        : `${agent.linkedChannelCount} canais`

  return (
    <TableRow>
      <TableCell>
        <div className="flex flex-col">
          <span className="font-medium">{agent.name}</span>
          {agent.description !== null && agent.description !== undefined && (
            <span className="text-muted-foreground text-sm">
              {agent.description}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="secondary">
          {PROVIDER_LABELS[agent.provider] ?? agent.provider}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant={agent.isActive ? 'default' : 'secondary'}>
          {agent.isActive ? 'Ativo' : 'Inativo'}
        </Badge>
      </TableCell>
      <TableCell>{channelCountText}</TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger
            className="hover:bg-accent inline-flex h-10 w-10 items-center justify-center rounded-md"
            aria-label={`Acoes do agente ${agent.name}`}
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(agent)}>
              <Pencil />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate(agent)}>
              <Copy />
              Duplicar
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDelete(agent)}
            >
              <Trash2 />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}

export function AiAgentsTableSkeleton() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Provider</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Canais</TableHead>
            <TableHead className="w-12">
              <span className="sr-only">Ações</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 3 }, (_, index) => (
            <TableRow key={index}>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-16" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-14" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-16" />
              </TableCell>
              <TableCell>
                <Skeleton className="size-8" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
