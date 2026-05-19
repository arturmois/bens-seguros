'use client'

import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { use } from 'react'

import { FormPageShell } from '@/components/shared/form-page-shell'
import { Button } from '@/components/ui/button'
import { AiAgentForm } from '@/features/ai-agents/components/ai-agent-form'
import { useAiAgent } from '@/features/ai-agents/hooks/use-ai-agents'

interface EditAiAgentPageProps {
  readonly params: Promise<{ id: string }>
}

const BACK_HREF = '/settings?section=agentes-ia'

export default function EditAiAgentPage({ params }: EditAiAgentPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { data: agent, isLoading, isError } = useAiAgent(id)
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    )
  }
  if (isError || !agent) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <p role="alert" className="text-destructive text-sm">
          Agente não encontrado.
        </p>
        <Button variant="link" onClick={() => router.push(BACK_HREF)}>
          Voltar para agentes
        </Button>
      </div>
    )
  }
  return (
    <FormPageShell
      breadcrumb={[
        { label: 'Configurações', href: '/settings' },
        { label: 'Agentes de IA', href: BACK_HREF },
        { label: agent.name },
        { label: 'Editar' },
      ]}
      title="Editar agente"
      description="Atualize as configurações do agente de IA."
      cardTitle="Dados do agente"
      cardDescription="Altere os campos necessários e salve."
    >
      <AiAgentForm
        mode="edit"
        initial={agent}
        onSuccess={() => router.push(BACK_HREF)}
        onCancel={() => router.push(BACK_HREF)}
      />
    </FormPageShell>
  )
}
