'use client'

import type { Control } from 'react-hook-form'
import { Controller } from 'react-hook-form'

import { FormField } from '@/components/shared/form-field'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import type { AiAgentData } from '@/features/ai-agents/types'
import type { ChannelFormValues } from '../lib/schemas'

interface ChannelAiAgentSelectProps {
  readonly control: Control<ChannelFormValues>
  readonly agents: AiAgentData[] | undefined
}

function getDisplayLabel(
  value: string | null | undefined,
  agents: AiAgentData[] | undefined
): string {
  if (!value || value === 'none') return 'Nenhum'
  return agents?.find((a) => a.id === value)?.name ?? 'Selecione um agente'
}

export function ChannelAiAgentSelect({
  control,
  agents,
}: ChannelAiAgentSelectProps) {
  return (
    <FormField label="Agente de IA">
      <Controller
        name="aiAgentId"
        control={control}
        render={({ field }) => (
          <Select
            value={field.value ?? 'none'}
            onValueChange={(v) => field.onChange(v === 'none' ? null : v)}
          >
            <SelectTrigger>
              <span className="flex-1 truncate">
                {getDisplayLabel(field.value, agents)}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum</SelectItem>
              {agents?.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  <span className="flex items-center gap-2">
                    {agent.name}
                    <Badge
                      variant={agent.isActive ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {agent.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </FormField>
  )
}
