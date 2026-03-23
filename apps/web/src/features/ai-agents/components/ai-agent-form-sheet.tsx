'use client'

import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
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

const PROVIDER_OPTIONS = [
  { value: 'claude', label: 'Claude (Anthropic)' },
  { value: 'openai', label: 'OpenAI' },
] as const

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
              ? 'Atualize as configuracoes do agente de IA.'
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
            label="Descricao"
            error={form.formState.errors.description?.message}
          >
            <Input
              placeholder="Breve descricao do agente"
              {...form.register('description')}
            />
          </FormField>
          <FormField
            label="System Prompt"
            error={form.formState.errors.systemPrompt?.message}
            helperText="Instrucoes de comportamento do agente. Max 2000 caracteres."
          >
            <Textarea
              placeholder="Voce e um assistente especializado em seguros..."
              rows={5}
              maxLength={2000}
              {...form.register('systemPrompt')}
            />
          </FormField>
          <FormField
            label="Provider"
            error={form.formState.errors.provider?.message}
            required
          >
            <Controller
              name="provider"
              control={form.control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDER_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField
            label="Temperature"
            error={form.formState.errors.temperature?.message}
            helperText="Criatividade das respostas (0 = deterministico, 1 = criativo)"
          >
            <Input
              type="number"
              step={0.1}
              min={0}
              max={1}
              {...form.register('temperature')}
            />
          </FormField>
          <FormField
            label="Max Tokens"
            error={form.formState.errors.maxTokens?.message}
          >
            <Input
              type="number"
              min={100}
              max={2000}
              {...form.register('maxTokens')}
            />
          </FormField>
          <FormField
            label="Max Respostas por Conversa"
            error={form.formState.errors.maxResponsesPerConversation?.message}
          >
            <Input
              type="number"
              min={5}
              max={100}
              {...form.register('maxResponsesPerConversation')}
            />
          </FormField>
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

interface ActiveToggleProps {
  readonly checked: boolean
  readonly onCheckedChange: (checked: boolean) => void
}

function ActiveToggle({ checked, onCheckedChange }: ActiveToggleProps) {
  return (
    <div className="border-border flex items-center justify-between rounded-lg border p-4">
      <Label htmlFor="isActive" className="cursor-pointer">
        Ativo
      </Label>
      <Switch
        id="isActive"
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    </div>
  )
}

interface LinkedChannelsSectionProps {
  readonly channels: ReadonlyArray<{
    readonly id: string
    readonly name: string
  }>
}

function LinkedChannelsSection({ channels }: LinkedChannelsSectionProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Canais vinculados</p>
      <div className="flex flex-wrap gap-2">
        {channels.map((ch) => (
          <Badge key={ch.id} variant="secondary">
            {ch.name}
          </Badge>
        ))}
      </div>
    </div>
  )
}
