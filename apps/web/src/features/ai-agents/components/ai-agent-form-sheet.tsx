'use client'

import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'

import type { AiAgentData } from '../types'
import {
  useAiAgent,
  useCreateAiAgent,
  useUpdateAiAgent,
} from '../hooks/use-ai-agents'
import {
  aiAgentFormSchema,
  DEFAULT_AGENT_FORM,
  type AiAgentFormValues,
} from '../lib/schemas'
import {
  ActiveToggle,
  AiAgentNumericFields,
  AiAgentProviderSelect,
  LinkedChannelsSection,
} from './ai-agent-form-parts'

interface AiAgentFormSheetProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly agent?: AiAgentData
}

export function AiAgentFormSheet({
  open,
  onOpenChange,
  agent,
}: AiAgentFormSheetProps) {
  const isEditMode = Boolean(agent) && agent?.id !== ''
  const agentDetail = useAiAgent(isEditMode && agent ? agent.id : null)
  const createAgent = useCreateAiAgent()
  const updateAgent = useUpdateAiAgent()
  const isPending = createAgent.isPending || updateAgent.isPending

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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {isEditMode ? 'Editar Agente' : 'Novo Agente'}
          </SheetTitle>
          <SheetDescription>
            {isEditMode
              ? 'Atualize as configurações do agente de IA.'
              : 'Configure um novo agente de IA para atendimento.'}
          </SheetDescription>
        </SheetHeader>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="mt-6 space-y-4 px-6"
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
            helperText="Instruções de comportamento do agente. Max 2000 caracteres."
          >
            <Textarea
              placeholder="Você é um assistente especializado em seguros..."
              rows={5}
              maxLength={2000}
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
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {isEditMode ? 'Salvar' : 'Criar Agente'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
