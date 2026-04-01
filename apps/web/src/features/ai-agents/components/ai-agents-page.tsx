'use client'

import { useCallback, useState } from 'react'
import { AlertTriangle, Brain, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'

import type { AiAgentData } from '../types'
import { useAiAgents } from '../hooks/use-ai-agents'
import { AiAgentFormSheet } from './ai-agent-form-sheet'
import { AiAgentsTable, AiAgentsTableSkeleton } from './ai-agents-table'
import { DeleteAgentDialog } from './delete-agent-dialog'

const MAX_NAME_LENGTH = 100
const DUPLICATE_PREFIX = 'Copia de '

export function AiAgentsPage() {
  const { data: agents, isLoading, isError, refetch } = useAiAgents()

  const [formOpen, setFormOpen] = useState(false)
  const [editingAgent, setEditingAgent] = useState<AiAgentData | undefined>(
    undefined
  )
  const [deleteAgent, setDeleteAgent] = useState<AiAgentData | null>(null)

  const handleCreate = useCallback(() => {
    setEditingAgent(undefined)
    setFormOpen(true)
  }, [])

  const handleEdit = useCallback((agent: AiAgentData) => {
    setEditingAgent(agent)
    setFormOpen(true)
  }, [])

  const handleDuplicate = useCallback((agent: AiAgentData) => {
    const duplicateName = `${DUPLICATE_PREFIX}${agent.name}`.slice(
      0,
      MAX_NAME_LENGTH
    )
    setEditingAgent({
      ...agent,
      id: '',
      name: duplicateName,
      linkedChannelCount: 0,
    })
    setFormOpen(true)
  }, [])

  const handleDelete = useCallback((agent: AiAgentData) => {
    setDeleteAgent(agent)
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Agentes de IA
          </h2>
          <p className="text-muted-foreground text-sm">
            Gerencie seus agentes de IA para automatizar atendimentos.
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 size-4" />
          Novo Agente
        </Button>
      </div>

      <AiAgentsContent
        agents={agents}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        onCreate={handleCreate}
        onEdit={handleEdit}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
      />

      <AiAgentFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        agent={editingAgent}
      />

      <DeleteAgentDialog
        open={deleteAgent !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteAgent(null)
        }}
        agent={deleteAgent}
      />
    </div>
  )
}

interface AiAgentsContentProps {
  readonly agents: readonly AiAgentData[] | undefined
  readonly isLoading: boolean
  readonly isError: boolean
  readonly onRetry: () => void
  readonly onCreate: () => void
  readonly onEdit: (agent: AiAgentData) => void
  readonly onDuplicate: (agent: AiAgentData) => void
  readonly onDelete: (agent: AiAgentData) => void
}

function AiAgentsContent({
  agents,
  isLoading,
  isError,
  onRetry,
  onCreate,
  onEdit,
  onDuplicate,
  onDelete,
}: AiAgentsContentProps) {
  if (isLoading) {
    return <AiAgentsTableSkeleton />
  }

  if (isError) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <AlertTriangle />
          </EmptyMedia>
          <EmptyTitle>Erro ao carregar agentes</EmptyTitle>
          <EmptyDescription>
            Não foi possível carregar os agentes. Tente novamente.
          </EmptyDescription>
        </EmptyHeader>
        <Button variant="outline" onClick={onRetry}>
          Tentar novamente
        </Button>
      </Empty>
    )
  }

  if (!agents || agents.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Brain />
          </EmptyMedia>
          <EmptyTitle>Nenhum agente configurado</EmptyTitle>
          <EmptyDescription>
            Crie seu primeiro agente de IA para automatizar atendimentos.
          </EmptyDescription>
        </EmptyHeader>
        <Button onClick={onCreate}>
          <Plus className="mr-2 size-4" />
          Novo Agente
        </Button>
      </Empty>
    )
  }

  return (
    <AiAgentsTable
      agents={agents}
      onEdit={onEdit}
      onDuplicate={onDuplicate}
      onDelete={onDelete}
    />
  )
}
