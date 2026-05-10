'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogTitle,
} from '@/components/ui/dialog'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

import {
  useAiAgent,
  useAvailableTools,
  useCreateAiAgent,
  useUpdateAiAgent,
} from '../hooks/use-ai-agents'
import {
  aiAgentFormSchema,
  DEFAULT_AGENT_FORM,
  type AiAgentFormValues,
} from '../lib/schemas'
import type { AiAgentData } from '../types'
import {
  ActiveToggle,
  AiAgentNumericFields,
  AiAgentProviderSelect,
  LinkedChannelsSection,
} from './ai-agent-form-parts'
import { ToolsToggleSection } from './tools-toggle-section'

interface AiAgentFormDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly agent?: AiAgentData
}

export function AiAgentFormDialog({
  open,
  onOpenChange,
  agent,
}: AiAgentFormDialogProps) {
  const isEditMode = Boolean(agent) && agent?.id !== ''
  const agentDetail = useAiAgent(isEditMode && agent ? agent.id : null)
  const createAgent = useCreateAiAgent()
  const updateAgent = useUpdateAiAgent()
  const isPending = createAgent.isPending || updateAgent.isPending
  const availableTools = useAvailableTools()
  const form = useForm<AiAgentFormValues>({
    resolver: zodResolver(aiAgentFormSchema),
    defaultValues: agent
      ? {
          name: agent.name,
          description: agent.description ?? '',
          systemPrompt: agent.systemPrompt ?? '',
          provider: agent.provider,
          temperature: agent.temperature,
          maxTokens: agent.maxTokens,
          maxResponsesPerConversation: agent.maxResponsesPerConversation,
          isActive: agent.isActive,
          enabledTools: agent.enabledTools ?? [],
        }
      : DEFAULT_AGENT_FORM,
  })
  useEffect(() => {
    if (!open) return
    if (agent) {
      form.reset({
        name: agent.name,
        description: agent.description ?? '',
        systemPrompt: agent.systemPrompt ?? '',
        provider: agent.provider,
        temperature: agent.temperature,
        maxTokens: agent.maxTokens,
        maxResponsesPerConversation: agent.maxResponsesPerConversation,
        isActive: agent.isActive,
        enabledTools: agent.enabledTools ?? [],
      })
      return
    }
    form.reset(DEFAULT_AGENT_FORM)
  }, [open, agent, form])
  function handleSubmit(values: AiAgentFormValues) {
    if (isEditMode && agent) {
      updateAgent.mutate(
        { id: agent.id, payload: values },
        { onSuccess: () => onOpenChange(false) }
      )
      return
    }
    createAgent.mutate(values, { onSuccess: () => onOpenChange(false) })
  }
  const linkedChannels = agentDetail.data?.linkedChannels ?? []
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Editar agente' : 'Novo agente'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Atualize as configurações do agente de IA.'
              : 'Configure um novo agente de IA para atendimento.'}
          </DialogDescription>
        </DialogHeader>
        <DialogPanel>
          <form
            id="ai-agent-form"
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              label="Nome"
              error={form.formState.errors.name?.message}
              required
            >
              <Input
                placeholder="Ex: Agente de Vendas"
                {...form.register('name')}
              />
            </FormField>
            <FormField
              label="Descrição"
              error={form.formState.errors.description?.message}
            >
              <Input
                placeholder="Breve descrição do agente"
                {...form.register('description')}
              />
            </FormField>
            <FormField
              label="System Prompt"
              error={form.formState.errors.systemPrompt?.message}
              helperText="Instruções de comportamento do agente. Max 4000 caracteres."
            >
              <Textarea
                placeholder="Você é um assistente especializado em seguros..."
                rows={5}
                maxLength={4000}
                {...form.register('systemPrompt')}
              />
            </FormField>
            <AiAgentProviderSelect
              control={form.control}
              error={form.formState.errors.provider?.message}
            />
            <AiAgentNumericFields
              register={form.register}
              errors={form.formState.errors}
            />
            {availableTools.data && (
              <ToolsToggleSection
                availableTools={availableTools.data}
                control={form.control}
                setValue={form.setValue}
                defaultOpen={isEditMode}
              />
            )}
            <Controller
              name="isActive"
              control={form.control}
              render={({ field }) => (
                <ActiveToggle
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            {isEditMode && linkedChannels.length > 0 && (
              <LinkedChannelsSection channels={linkedChannels} />
            )}
          </form>
        </DialogPanel>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type="submit" form="ai-agent-form" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {isEditMode ? 'Salvar' : 'Criar agente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
