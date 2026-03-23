'use client'

import { Controller } from 'react-hook-form'
import type { Control } from 'react-hook-form'

import { Badge } from '@/components/ui/badge'
import { FormField } from '@/components/ui/form-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { AiAgentData } from '@/features/ai-agents/types'
import type { ChannelFormValues } from '../lib/schemas'

interface ChannelAiAgentSelectProps {
  readonly control: Control<ChannelFormValues>
  readonly agents: AiAgentData[] | undefined
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
              <SelectValue placeholder="Selecione um agente" />
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
