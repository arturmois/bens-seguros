'use client'

import { ChevronDown } from 'lucide-react'
import { useWatch } from 'react-hook-form'
import type { Control, UseFormSetValue } from 'react-hook-form'

import {
  Collapsible,
  CollapsibleTrigger,
  CollapsiblePanel,
} from '@/components/ui/collapsible'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

import type { AiAgentFormValues } from '../lib/schemas'
import type { AvailableTool } from '../types'

interface ToolsToggleSectionProps {
  readonly availableTools: readonly AvailableTool[]
  readonly control: Control<AiAgentFormValues>
  readonly setValue: UseFormSetValue<AiAgentFormValues>
  readonly defaultOpen?: boolean
}

export function ToolsToggleSection({
  availableTools,
  control,
  setValue,
  defaultOpen = false,
}: ToolsToggleSectionProps) {
  const enabledTools = useWatch({ control, name: 'enabledTools' })
  function handleToggle(toolName: string, enabled: boolean) {
    const current = enabledTools ?? []
    if (enabled) {
      setValue('enabledTools', [...current, toolName], { shouldDirty: true })
      return
    }
    setValue(
      'enabledTools',
      current.filter((t) => t !== toolName),
      { shouldDirty: true }
    )
  }
  return (
    <Collapsible defaultOpen={defaultOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border p-4">
        <span className="font-medium text-sm">
          Ferramentas ({enabledTools.length}/{availableTools.length})
        </span>
        <ChevronDown className="size-4 text-muted-foreground transition-transform [[data-panel-open]_&]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsiblePanel>
        <div className="space-y-1 pt-2">
          <p className="px-1 text-muted-foreground text-xs">
            Selecione as ferramentas que este agente pode utilizar durante as
            conversas. A transferência para atendente humano está sempre
            disponível.
          </p>
          <div className="space-y-1 pt-2">
            {availableTools.map((tool) => (
              <div
                key={tool.name}
                className="flex items-center justify-between rounded-md px-1 py-2"
              >
                <div className="space-y-0.5">
                  <Label
                    htmlFor={`tool-${tool.name}`}
                    className="cursor-pointer text-sm"
                  >
                    {tool.label}
                  </Label>
                  <p className="text-muted-foreground text-xs">
                    {tool.description}
                  </p>
                </div>
                <Switch
                  id={`tool-${tool.name}`}
                  checked={enabledTools.includes(tool.name)}
                  onCheckedChange={(checked) =>
                    handleToggle(tool.name, checked)
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </CollapsiblePanel>
    </Collapsible>
  )
}
