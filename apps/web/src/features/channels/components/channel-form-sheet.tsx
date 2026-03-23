'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'

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
import type { ChannelData, CreateChannelPayload } from '../types'
import { useCreateChannel, useUpdateChannel } from '../hooks/use-channels'
import { channelFormSchema, EMPTY_CHANNEL_FORM } from '../lib/schemas'
import type { ChannelFormValues } from '../lib/schemas'
import { ChannelAiAgentSelect } from './channel-ai-agent-select'
import {
  ChannelBrokerTypeSelect,
  ChannelMetaFields,
} from './channel-meta-fields'

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
          name: channel.name,
          brokerType: channel.brokerType,
          phoneNumber: channel.phoneNumber ?? '',
        }
      : EMPTY_CHANNEL_FORM,
  })

  const watchedBrokerType = form.watch('brokerType')

  useEffect(() => {
    if (!open) return

    if (channel) {
      form.reset({
        name: channel.name,
        brokerType: channel.brokerType,
        phoneNumber: channel.phoneNumber ?? '',
        aiAgentId: channel.aiAgentId ?? null,
      })
      return
    }

    form.reset(EMPTY_CHANNEL_FORM)
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
          },
        },
        { onSuccess: () => onOpenChange(false) }
      )
      return
    }

    const payload: CreateChannelPayload = {
      name: values.name,
      type: 'WHATSAPP',
      brokerType: values.brokerType,
      phoneNumber: values.phoneNumber,
      ...(values.brokerType === 'META'
        ? { metaToken: values.metaToken, phoneNumberId: values.phoneNumberId }
        : {}),
    }

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
              ? 'Atualize as informacoes do canal WhatsApp.'
              : 'Configure um novo canal WhatsApp para comunicacao.'}
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
              placeholder="Ex: WhatsApp Principal"
              {...form.register('name')}
            />
          </FormField>

          <ChannelBrokerTypeSelect
            control={form.control}
            disabled={isEditMode}
            error={form.formState.errors.brokerType?.message}
          />

          <FormField
            label="Numero"
            error={form.formState.errors.phoneNumber?.message}
          >
            <Input
              placeholder="Ex: +55 11 99999-0000"
              {...form.register('phoneNumber')}
            />
          </FormField>

          {isEditMode && (
            <ChannelAiAgentSelect control={form.control} agents={aiAgents} />
          )}

          {watchedBrokerType === 'META' && (
            <ChannelMetaFields
              register={form.register}
              errors={form.formState.errors}
            />
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
