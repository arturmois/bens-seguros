'use client'

import { Controller } from 'react-hook-form'
import type { Control, UseFormRegister, FieldErrors } from 'react-hook-form'

import { Badge } from '@/components/ui/badge'
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
import { Switch } from '@/components/ui/switch'

import type { AiAgentFormValues } from '../lib/schemas'

const PROVIDER_OPTIONS = [
  { value: 'claude', label: 'Claude (Anthropic)' },
  { value: 'openai', label: 'OpenAI' },
] as const

export interface ActiveToggleProps {
  readonly checked: boolean
  readonly onCheckedChange: (checked: boolean) => void
}

export function ActiveToggle({ checked, onCheckedChange }: ActiveToggleProps) {
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

export interface LinkedChannelsSectionProps {
  readonly channels: ReadonlyArray<{
    readonly id: string
    readonly name: string
  }>
}

export function LinkedChannelsSection({
  channels,
}: LinkedChannelsSectionProps) {
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

interface AiAgentProviderSelectProps {
  readonly control: Control<AiAgentFormValues>
  readonly error?: string
}

export function AiAgentProviderSelect({
  control,
  error,
}: AiAgentProviderSelectProps) {
  return (
    <FormField label="Provider" error={error} required>
      <Controller
        name="provider"
        control={control}
        render={({ field }) => (
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o provider">
                {(value: string | null) => {
                  const item = PROVIDER_OPTIONS.find((o) => o.value === value)
                  return item?.label ?? null
                }}
              </SelectValue>
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
  )
}

interface AiAgentNumericFieldsProps {
  readonly register: UseFormRegister<AiAgentFormValues>
  readonly errors: FieldErrors<AiAgentFormValues>
}

export function AiAgentNumericFields({
  register,
  errors,
}: AiAgentNumericFieldsProps) {
  return (
    <>
      <FormField
        label="Temperature"
        error={errors.temperature?.message}
        helperText="Criatividade das respostas (0 = deterministico, 1 = criativo)"
      >
        <Input
          type="number"
          step={0.1}
          min={0}
          max={1}
          {...register('temperature')}
        />
      </FormField>
      <FormField label="Max Tokens" error={errors.maxTokens?.message}>
        <Input type="number" min={100} max={2000} {...register('maxTokens')} />
      </FormField>
      <FormField
        label="Max Respostas por Conversa"
        error={errors.maxResponsesPerConversation?.message}
      >
        <Input
          type="number"
          min={5}
          max={100}
          {...register('maxResponsesPerConversation')}
        />
      </FormField>
    </>
  )
}
