'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { FormDialogShell } from '@/components/shared/form-dialog-shell'
import { FormField } from '@/components/shared/form-field'
import { Input } from '@/components/ui/input'

import { useCreateChannel } from '../hooks/use-channels'
import type { ChannelFormValues } from '../lib/schemas'
import { buildEmptyChannelForm, channelFormSchema } from '../lib/schemas'
import {
  buildCreatePayload,
  ChannelTypeSelect,
  getNamePlaceholder,
  WebChatFields,
  WhatsAppFields,
} from './channel-form-fields'

const FORM_ID = 'create-channel-form'

interface ChannelFormDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
}

export function ChannelFormDialog({
  open,
  onOpenChange,
}: ChannelFormDialogProps) {
  const createChannel = useCreateChannel()
  return (
    <FormDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Novo canal"
      description="Configure um novo canal de comunicação."
      formId={FORM_ID}
      isPending={createChannel.isPending}
      submitLabel="Criar canal"
      keyboardHintAction="criar"
      size="md"
    >
      {open && (
        <ChannelFormBody
          mutation={createChannel}
          onSubmitted={() => onOpenChange(false)}
        />
      )}
    </FormDialogShell>
  )
}

interface ChannelFormBodyProps {
  readonly mutation: ReturnType<typeof useCreateChannel>
  readonly onSubmitted: () => void
}

function ChannelFormBody({ mutation, onSubmitted }: ChannelFormBodyProps) {
  const form = useForm<ChannelFormValues>({
    resolver: zodResolver(channelFormSchema),
    defaultValues: buildEmptyChannelForm(),
  })
  const watchedChannelType = form.watch('channelType')
  function handleSubmit(values: ChannelFormValues) {
    const payload = buildCreatePayload(values)
    mutation.mutate(payload, {
      onSuccess: () => onSubmitted(),
    })
  }
  return (
    <form
      id={FORM_ID}
      onSubmit={form.handleSubmit(handleSubmit)}
      className="space-y-4"
      noValidate
    >
      <ChannelTypeSelect
        control={form.control}
        error={form.formState.errors.channelType?.message}
      />
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
          isEditMode={false}
        />
      )}
      {watchedChannelType === 'WEB_CHAT' && (
        <WebChatFields register={form.register} />
      )}
    </form>
  )
}
