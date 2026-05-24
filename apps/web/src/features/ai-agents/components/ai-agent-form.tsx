'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Controller, FormProvider, useForm } from 'react-hook-form'

import { FormActions } from '@/components/shared/form-actions'
import { FormField } from '@/components/shared/form-field'
import { FormGrid } from '@/components/shared/form-grid'
import { FormSection } from '@/components/shared/form-section'
import { Button } from '@/components/ui/button'
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

interface AiAgentFormProps {
  readonly mode?: 'create' | 'edit'
  readonly initial?: AiAgentData
  readonly defaultValues?: AiAgentFormValues
  readonly onSuccess?: (agent: AiAgentData) => void
  readonly onCancel?: () => void
  readonly onPendingChange?: (pending: boolean) => void
  readonly hideFooter?: boolean
  readonly formId?: string
}

function buildDefaults(agent?: AiAgentData): AiAgentFormValues {
  if (!agent) return DEFAULT_AGENT_FORM
  return {
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
}

export function AiAgentForm({
  mode = 'create',
  initial,
  defaultValues,
  onSuccess,
  onCancel,
  onPendingChange,
  hideFooter,
  formId,
}: AiAgentFormProps) {
  const router = useRouter()
  const isEdit = mode === 'edit'
  const agentDetail = useAiAgent(isEdit && initial ? initial.id : null)
  const createAgent = useCreateAiAgent()
  const updateAgent = useUpdateAiAgent()
  const isPending = createAgent.isPending || updateAgent.isPending
  const availableTools = useAvailableTools()
  const form = useForm<AiAgentFormValues>({
    resolver: zodResolver(aiAgentFormSchema),
    mode: 'onBlur',
    values: defaultValues ?? buildDefaults(initial),
    resetOptions: { keepDirtyValues: true },
  })
  useEffect(() => {
    onPendingChange?.(isPending)
  }, [isPending, onPendingChange])
  function handleSubmit(values: AiAgentFormValues) {
    if (isEdit && initial) {
      updateAgent.mutate(
        { id: initial.id, payload: values },
        {
          onSuccess: (updated) => {
            if (onSuccess) {
              onSuccess(updated)
              return
            }
            router.push('/settings?section=agentes-ia')
          },
        }
      )
      return
    }
    createAgent.mutate(values, {
      onSuccess: (created) => {
        if (onSuccess) {
          onSuccess(created)
          return
        }
        router.push('/settings?section=agentes-ia')
      },
    })
  }
  function handleCancel() {
    if (onCancel) {
      onCancel()
      return
    }
    router.push('/settings?section=agentes-ia')
  }
  const linkedChannels = agentDetail.data?.linkedChannels ?? []
  const errors = form.formState.errors
  return (
    <FormProvider {...form}>
      <form
        id={formId}
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-6"
        noValidate
      >
        <FormSection title="Identidade">
          <FormGrid columns={2}>
            <FormField label="Nome" error={errors.name?.message} required>
              <Input
                placeholder="Ex: Agente de Vendas"
                {...form.register('name')}
              />
            </FormField>
            <FormField label="Descrição" error={errors.description?.message}>
              <Input
                placeholder="Breve descrição do agente"
                {...form.register('description')}
              />
            </FormField>
            <FormField
              label="System Prompt"
              span="full"
              error={errors.systemPrompt?.message}
              hint="Instruções de comportamento do agente. Max 4000 caracteres."
            >
              <Textarea
                placeholder="Você é um assistente especializado em seguros..."
                rows={5}
                maxLength={4000}
                {...form.register('systemPrompt')}
              />
            </FormField>
          </FormGrid>
        </FormSection>
        <FormSection title="Comportamento">
          <FormGrid columns={2}>
            <AiAgentProviderSelect
              control={form.control}
              error={errors.provider?.message}
            />
            <AiAgentNumericFields
              register={form.register}
              errors={form.formState.errors}
            />
          </FormGrid>
        </FormSection>
        {availableTools.data && (
          <ToolsToggleSection
            availableTools={availableTools.data}
            control={form.control}
            setValue={form.setValue}
            defaultOpen={isEdit}
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
        {isEdit && linkedChannels.length > 0 && (
          <LinkedChannelsSection channels={linkedChannels} />
        )}
        {!hideFooter && (
          <FormActions>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isEdit ? 'Salvar alterações' : 'Criar agente'}
            </Button>
          </FormActions>
        )}
      </form>
    </FormProvider>
  )
}
