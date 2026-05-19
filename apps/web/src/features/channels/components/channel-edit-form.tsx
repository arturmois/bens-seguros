'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { FormProvider, useForm } from 'react-hook-form'

import { FormActions } from '@/components/shared/form-actions'
import { FormField } from '@/components/shared/form-field'
import { FormGrid } from '@/components/shared/form-grid'
import { FormSection } from '@/components/shared/form-section'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { useAiAgents } from '@/features/ai-agents/hooks/use-ai-agents'
import { useUpdateChannel } from '../hooks/use-channels'
import type { ChannelFormValues } from '../lib/schemas'
import { channelFormSchema } from '../lib/schemas'
import type { ChannelData } from '../types'
import { ChannelAiAgentSelect } from './channel-ai-agent-select'
import { WebChatFields } from './channel-form-fields'

interface ChannelEditFormProps {
  readonly initial: ChannelData
  readonly onSuccess?: () => void
  readonly onCancel?: () => void
}

function buildDefaults(channel: ChannelData): ChannelFormValues {
  const cfg = channel.config ?? {}
  const cfgString = (key: string): string => {
    const val = cfg[key]
    return typeof val === 'string' ? val : ''
  }
  const rawOrigins = cfg['allowedOrigins']
  const allowedOriginsValue = Array.isArray(rawOrigins)
    ? rawOrigins.filter((o): o is string => typeof o === 'string').join(', ')
    : typeof rawOrigins === 'string'
      ? rawOrigins
      : ''
  return {
    channelType: channel.type,
    name: channel.name,
    brokerType:
      channel.brokerType === 'WEB_CHAT'
        ? 'WEB_CHAT'
        : channel.brokerType === 'META'
          ? 'META'
          : 'BAILEYS',
    phoneNumber: channel.phoneNumber ?? '',
    aiAgentId: channel.aiAgentId ?? null,
    widgetColor: cfgString('widgetColor') || '#1f4b5f',
    welcomeMessage: cfgString('welcomeMessage'),
    allowedOrigins: allowedOriginsValue,
  }
}

export function ChannelEditForm({
  initial,
  onSuccess,
  onCancel,
}: ChannelEditFormProps) {
  const router = useRouter()
  const updateChannel = useUpdateChannel()
  const { data: aiAgents } = useAiAgents()
  const form = useForm<ChannelFormValues>({
    resolver: zodResolver(channelFormSchema),
    mode: 'onBlur',
    defaultValues: buildDefaults(initial),
  })
  useEffect(() => {
    if (form.formState.isDirty) return
    form.reset(buildDefaults(initial))
  }, [initial, form])
  const isWebChat = initial.type === 'WEB_CHAT'
  const isPending = updateChannel.isPending
  function handleSubmit(values: ChannelFormValues) {
    updateChannel.mutate(
      {
        id: initial.id,
        payload: {
          name: values.name,
          phoneNumber: values.phoneNumber,
          aiAgentId: values.aiAgentId,
          ...(isWebChat
            ? {
                config: {
                  widgetColor: values.widgetColor,
                  welcomeMessage: values.welcomeMessage,
                  allowedOrigins: values.allowedOrigins
                    ?.split(',')
                    .map((o) => o.trim())
                    .filter(Boolean),
                },
              }
            : {}),
        },
      },
      {
        onSuccess: () => {
          if (onSuccess) {
            onSuccess()
            return
          }
          router.push('/settings/channels')
        },
      }
    )
  }
  function handleCancel() {
    if (onCancel) {
      onCancel()
      return
    }
    router.push('/settings/channels')
  }
  const errors = form.formState.errors
  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-8"
        noValidate
      >
        <FormSection title="Identificação">
          <FormGrid columns={2}>
            <FormField label="Nome" error={errors.name?.message} required>
              <Input placeholder="Nome do canal" {...form.register('name')} />
            </FormField>
            {!isWebChat && (
              <FormField
                label="Telefone"
                error={errors.phoneNumber?.message}
                hint="Formato E.164 (ex: +5511999998888)"
              >
                <Input
                  placeholder="+5511999998888"
                  {...form.register('phoneNumber')}
                />
              </FormField>
            )}
          </FormGrid>
        </FormSection>
        {isWebChat && (
          <FormSection title="Configuração do widget">
            <WebChatFields register={form.register} />
          </FormSection>
        )}
        <FormSection title="Inteligência artificial">
          <ChannelAiAgentSelect control={form.control} agents={aiAgents} />
        </FormSection>
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
            Salvar alterações
          </Button>
        </FormActions>
      </form>
    </FormProvider>
  )
}
