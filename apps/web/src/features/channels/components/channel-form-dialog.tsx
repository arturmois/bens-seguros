'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'

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

import { useAiAgents } from '@/features/ai-agents/hooks/use-ai-agents'
import { useCreateChannel, useUpdateChannel } from '../hooks/use-channels'
import type { ChannelFormValues, FormBrokerType } from '../lib/schemas'
import {
  buildEmptyChannelForm,
  channelFormSchema,
  FORM_BROKER_TYPES,
} from '../lib/schemas'
import type { ChannelData } from '../types'
import { ChannelAiAgentSelect } from './channel-ai-agent-select'
import {
  buildCreatePayload,
  ChannelTypeSelect,
  getNamePlaceholder,
  WebChatFields,
  WhatsAppFields,
} from './channel-form-fields'

const VALID_FORM_BROKER_TYPES: ReadonlySet<string> = new Set(FORM_BROKER_TYPES)

function isFormBrokerType(value: string): value is FormBrokerType {
  return VALID_FORM_BROKER_TYPES.has(value)
}

function toFormBrokerType(value: string): FormBrokerType {
  if (isFormBrokerType(value)) {
    return value
  }
  return 'BAILEYS'
}

interface ChannelFormDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly channel?: ChannelData
}

export function ChannelFormDialog({
  open,
  onOpenChange,
  channel,
}: ChannelFormDialogProps) {
  const isEditMode = Boolean(channel)
  const createChannel = useCreateChannel()
  const updateChannel = useUpdateChannel()
  const isPending = createChannel.isPending || updateChannel.isPending
  const { data: aiAgents } = useAiAgents()

  const form = useForm<ChannelFormValues>({
    resolver: zodResolver(channelFormSchema),
    defaultValues: channel
      ? {
          channelType: channel.type,
          name: channel.name,
          brokerType: toFormBrokerType(channel.brokerType),
          phoneNumber: channel.phoneNumber ?? '',
        }
      : buildEmptyChannelForm(),
  })

  const watchedChannelType = form.watch('channelType')

  useEffect(() => {
    if (!open) return

    if (channel) {
      const cfg = channel.config
      const cfgString = (key: string): string => {
        const val = cfg?.[key]
        return typeof val === 'string' ? val : ''
      }
      const rawOrigins = cfg?.['allowedOrigins']
      const allowedOriginsValue = Array.isArray(rawOrigins)
        ? rawOrigins
            .filter((o): o is string => typeof o === 'string')
            .join(', ')
        : typeof rawOrigins === 'string'
          ? rawOrigins
          : ''
      form.reset({
        channelType: channel.type,
        name: channel.name,
        brokerType: toFormBrokerType(channel.brokerType),
        phoneNumber: channel.phoneNumber ?? '',
        aiAgentId: channel.aiAgentId ?? null,
        widgetColor: cfgString('widgetColor') || '#1f4b5f',
        welcomeMessage: cfgString('welcomeMessage'),
        allowedOrigins: allowedOriginsValue,
      })
      return
    }

    form.reset(buildEmptyChannelForm())
  }, [open, channel, form])

  function handleSubmit(values: ChannelFormValues) {
    if (isEditMode && channel) {
      updateChannel.mutate(
        {
          id: channel.id,
          payload: {
            name: values.name,
            phoneNumber: values.phoneNumber,
            aiAgentId: values.aiAgentId,
            ...(channel.type === 'WEB_CHAT'
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
        { onSuccess: () => onOpenChange(false) }
      )
      return
    }

    const payload = buildCreatePayload(values)
    createChannel.mutate(payload, {
      onSuccess: () => onOpenChange(false),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Editar canal' : 'Novo canal'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Atualize as informações do canal.'
              : 'Configure um novo canal de comunicação.'}
          </DialogDescription>
        </DialogHeader>

        <DialogPanel>
          <form
            id="channel-form"
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            {!isEditMode && (
              <ChannelTypeSelect
                control={form.control}
                error={form.formState.errors.channelType?.message}
              />
            )}

            <FormField
              label="Nome"
              error={form.formState.errors.name?.message}
              required
            >
              <Input
                placeholder={getNamePlaceholder(watchedChannelType)}
                {...form.register('name')}
              />
            </FormField>

            {watchedChannelType === 'WHATSAPP' && (
              <WhatsAppFields
                control={form.control}
                register={form.register}
                errors={form.formState.errors}
                isEditMode={isEditMode}
              />
            )}

            {watchedChannelType === 'WEB_CHAT' && (
              <WebChatFields register={form.register} />
            )}

            {isEditMode && (
              <ChannelAiAgentSelect control={form.control} agents={aiAgents} />
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
          <Button type="submit" form="channel-form" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {isEditMode ? 'Salvar' : 'Criar canal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
