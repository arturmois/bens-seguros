'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'

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
  MetaSocialFields,
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

interface ChannelFormSheetProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly channel?: ChannelData
}

export function ChannelFormSheet({
  open,
  onOpenChange,
  channel,
}: ChannelFormSheetProps) {
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
  const watchedBrokerType = form.watch('brokerType')
  const watchedMetaPageId = form.watch('metaPageId')
  const watchedMetaToken = form.watch('metaToken')
  const watchedMetaAppId = form.watch('metaAppId')
  const watchedMetaAppSecret = form.watch('metaAppSecret')

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
        metaAppId: cfgString('metaAppId'),
        metaAppSecret: cfgString('metaAppSecret'),
        metaPageId: cfgString('metaPageId'),
        metaToken: cfgString('metaToken'),
        phoneNumberId: cfgString('metaPhoneNumberId'),
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
      const isMetaSocial =
        channel.type === 'MESSENGER' || channel.type === 'INSTAGRAM'
      const isWhatsAppMeta =
        channel.type === 'WHATSAPP' && channel.brokerType === 'META'

      updateChannel.mutate(
        {
          id: channel.id,
          payload: {
            name: values.name,
            phoneNumber: values.phoneNumber,
            aiAgentId: values.aiAgentId,
            ...(isMetaSocial
              ? {
                  config: {
                    metaAppId: values.metaAppId,
                    metaAppSecret: values.metaAppSecret,
                    metaPageId: values.metaPageId,
                    metaToken: values.metaToken,
                  },
                }
              : {}),
            ...(isWhatsAppMeta
              ? {
                  config: {
                    metaAppId: values.metaAppId,
                    metaAppSecret: values.metaAppSecret,
                    metaToken: values.metaToken,
                    metaPhoneNumberId: values.phoneNumberId,
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isEditMode ? 'Editar Canal' : 'Novo Canal'}</SheetTitle>
          <SheetDescription>
            {isEditMode
              ? 'Atualize as informações do canal.'
              : 'Configure um novo canal de comunicação.'}
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="mt-6 space-y-4 px-6"
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
              watchedBrokerType={watchedBrokerType}
              isEditMode={isEditMode}
            />
          )}

          {watchedChannelType === 'WEB_CHAT' && (
            <WebChatFields register={form.register} />
          )}

          {(watchedChannelType === 'MESSENGER' ||
            watchedChannelType === 'INSTAGRAM') && (
            <MetaSocialFields
              register={form.register}
              errors={form.formState.errors}
              channelType={watchedChannelType}
              watchMetaPageId={watchedMetaPageId}
              watchMetaToken={watchedMetaToken}
              watchMetaAppId={watchedMetaAppId}
              watchMetaAppSecret={watchedMetaAppSecret}
            />
          )}

          {isEditMode && (
            <ChannelAiAgentSelect control={form.control} agents={aiAgents} />
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
              {isEditMode ? 'Salvar' : 'Criar Canal'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
