'use client'

import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
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

import { useAiAgentConfig, useUpdateAiAgent } from '../hooks/use-channels'

const aiAgentFormSchema = z.object({
  systemPrompt: z.string().max(2000),
  provider: z.enum(['claude', 'openai']),
  temperature: z.coerce.number().min(0).max(1),
  maxTokens: z.coerce.number().min(100).max(2000),
  maxResponsesPerConversation: z.coerce.number().min(5).max(100),
  isActive: z.boolean(),
})

type AiAgentFormValues = z.infer<typeof aiAgentFormSchema>

const DEFAULT_VALUES: AiAgentFormValues = {
  systemPrompt: '',
  provider: 'claude',
  temperature: 0.7,
  maxTokens: 300,
  maxResponsesPerConversation: 20,
  isActive: false,
}

interface AiAgentConfigSheetProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly channelId: string | null
}

export function AiAgentConfigSheet({
  open,
  onOpenChange,
  channelId,
}: AiAgentConfigSheetProps) {
  const { data: config, isLoading } = useAiAgentConfig(open ? channelId : null)
  const updateAiAgent = useUpdateAiAgent()

  const form = useForm<AiAgentFormValues>({
    resolver: zodResolver(aiAgentFormSchema),
    defaultValues: DEFAULT_VALUES,
  })

  useEffect(() => {
    if (!open || !config) return
    form.reset({
      systemPrompt: config.systemPrompt,
      provider: config.provider,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      maxResponsesPerConversation: config.maxResponsesPerConversation,
      isActive: config.isActive,
    })
  }, [open, config, form])

  function handleSubmit(values: AiAgentFormValues) {
    if (!channelId) return
    updateAiAgent.mutate(
      { channelId, data: values },
      { onSuccess: () => onOpenChange(false) }
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Configurar IA</SheetTitle>
          <SheetDescription>
            Configure o assistente de inteligencia artificial para este canal.
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
          </div>
        ) : (
          <AiAgentForm
            form={form}
            isPending={updateAiAgent.isPending}
            onSubmit={handleSubmit}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

function AiAgentForm({
  form,
  isPending,
  onSubmit,
  onCancel,
}: {
  readonly form: ReturnType<typeof useForm<AiAgentFormValues>>
  readonly isPending: boolean
  readonly onSubmit: (values: AiAgentFormValues) => void
  readonly onCancel: () => void
}) {
  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="mt-6 space-y-4 px-6"
    >
      <FormField label="Prompt do sistema" htmlFor="systemPrompt">
        <Textarea
          id="systemPrompt"
          rows={4}
          maxLength={2000}
          placeholder="Descreva como o assistente deve se comportar..."
          {...form.register('systemPrompt')}
        />
      </FormField>

      <FormField label="Provedor" htmlFor="provider">
        <Controller
          name="provider"
          control={form.control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="provider">
                <SelectValue placeholder="Selecione o provedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="claude">Claude</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </FormField>

      <FormField
        label="Temperatura"
        htmlFor="temperature"
        helperText="Valores mais altos geram respostas mais criativas (0 a 1)"
      >
        <Input
          id="temperature"
          type="number"
          min={0}
          max={1}
          step={0.1}
          {...form.register('temperature')}
        />
      </FormField>

      <FormField
        label="Max tokens"
        htmlFor="maxTokens"
        helperText="Limite de tokens por resposta (100 a 2000)"
      >
        <Input
          id="maxTokens"
          type="number"
          min={100}
          max={2000}
          {...form.register('maxTokens')}
        />
      </FormField>

      <FormField
        label="Max respostas por conversa"
        htmlFor="maxResponsesPerConversation"
        helperText="Numero maximo de respostas automaticas por conversa (5 a 100)"
      >
        <Input
          id="maxResponsesPerConversation"
          type="number"
          min={5}
          max={100}
          {...form.register('maxResponsesPerConversation')}
        />
      </FormField>

      <div className="flex items-center justify-between py-2">
        <Label htmlFor="isActive">Ativo</Label>
        <Controller
          name="isActive"
          control={form.control}
          render={({ field }) => (
            <Switch
              id="isActive"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
          Salvar
        </Button>
      </div>
    </form>
  )
}

interface FormFieldProps {
  readonly label: string
  readonly htmlFor: string
  readonly helperText?: string
  readonly children: React.ReactNode
}

function FormField({ label, htmlFor, helperText, children }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {helperText && (
        <p className="text-muted-foreground text-sm">{helperText}</p>
      )}
    </div>
  )
}
