'use client'

import { CHANNEL_META } from '@repo/shared'
import { Loader2 } from 'lucide-react'
import { Controller } from 'react-hook-form'
import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

import type { ChannelType } from '@/features/chat/types'
import { ChannelIcon } from '@/features/chat/components/channel-icon'
import type { ChannelFormValues } from '../lib/schemas'
import { CHANNEL_TYPE_OPTIONS } from '../lib/schemas'
import type { CreateChannelPayload } from '../types'
import { useValidateMetaChannel } from '../hooks/use-channels'

interface ChannelTypeSelectProps {
  readonly control: Control<ChannelFormValues>
  readonly error?: string
}

export function ChannelTypeSelect({ control, error }: ChannelTypeSelectProps) {
  return (
    <FormField label="Tipo de Canal" error={error} required>
      <Controller
        name="channelType"
        control={control}
        render={({ field }) => (
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo">
                {(value: string) => {
                  const meta = CHANNEL_META[value as ChannelType]
                  return meta ? (
                    <span className="flex items-center gap-2">
                      <ChannelIcon
                        channelType={value as ChannelType}
                        size={16}
                      />
                      {meta.label}
                    </span>
                  ) : null
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {CHANNEL_TYPE_OPTIONS.map((type) => (
                <SelectItem key={type} value={type}>
                  <span className="flex items-center gap-2">
                    <ChannelIcon channelType={type} size={16} />
                    {CHANNEL_META[type].label}
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

interface WhatsAppFieldsProps {
  readonly control: Control<ChannelFormValues>
  readonly register: UseFormRegister<ChannelFormValues>
  readonly errors: FieldErrors<ChannelFormValues>
  readonly watchedBrokerType: string | undefined
  readonly isEditMode: boolean
}

export function WhatsAppFields({
  control,
  register,
  errors,
  watchedBrokerType,
  isEditMode,
}: WhatsAppFieldsProps) {
  return (
    <>
      <FormField
        label="Tipo de Conexão"
        error={errors.brokerType?.message}
        helperText="Baileys conecta via QR Code. Meta usa a API oficial."
        required
      >
        <Controller
          name="brokerType"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={field.onChange}
              disabled={isEditMode}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione">
                  {(value: string) => {
                    const labels: Record<string, string> = {
                      BAILEYS: 'Baileys (WhatsApp Web)',
                      META: 'Meta (API Oficial)',
                    }
                    return labels[value] ?? null
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BAILEYS">Baileys (WhatsApp Web)</SelectItem>
                <SelectItem value="META">Meta (API Oficial)</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </FormField>

      <FormField label="Número" error={errors.phoneNumber?.message}>
        <Input
          placeholder="Ex: +55 11 99999-0000"
          {...register('phoneNumber')}
        />
      </FormField>

      {watchedBrokerType === 'META' && (
        <>
          <FormField label="Token" error={errors.metaToken?.message} required>
            <Input
              type="password"
              placeholder="Token de acesso permanente"
              {...register('metaToken')}
            />
          </FormField>
          <FormField
            label="Phone Number ID"
            error={errors.phoneNumberId?.message}
            required
          >
            <Input
              placeholder="ID do número no Meta Business"
              {...register('phoneNumberId')}
            />
          </FormField>
        </>
      )}
    </>
  )
}

interface WebChatFieldsProps {
  readonly register: UseFormRegister<ChannelFormValues>
}

export function WebChatFields({ register }: WebChatFieldsProps) {
  return (
    <>
      <FormField
        label="Cor do Widget"
        helperText="Cor principal do chat widget (hex)."
      >
        <Input placeholder="#1f4b5f" {...register('widgetColor')} />
      </FormField>

      <FormField label="Mensagem de Boas-Vindas">
        <Textarea
          placeholder="Olá! Como podemos ajudá-lo?"
          rows={3}
          {...register('welcomeMessage')}
        />
      </FormField>

      <FormField
        label="Origens Permitidas"
        helperText="URLs separadas por vírgula (ex: https://meusite.com)."
      >
        <Input
          placeholder="https://meusite.com, https://loja.meusite.com"
          {...register('allowedOrigins')}
        />
      </FormField>
    </>
  )
}

interface MetaSocialFieldsProps {
  readonly register: UseFormRegister<ChannelFormValues>
  readonly errors: FieldErrors<ChannelFormValues>
  readonly channelType: 'MESSENGER' | 'INSTAGRAM'
  readonly watchMetaPageId?: string
  readonly watchMetaToken?: string
}

export function MetaSocialFields({
  register,
  errors,
  channelType,
  watchMetaPageId,
  watchMetaToken,
}: MetaSocialFieldsProps) {
  const isInstagram = channelType === 'INSTAGRAM'
  const validate = useValidateMetaChannel()

  const pageIdHelper = isInstagram
    ? 'ID da conta Instagram. Encontre via Graph API Explorer: GET /me?fields=id,username (formato: 17841xxxxx)'
    : 'ID da Página do Facebook. Encontre em Configurações da Página > Transparência'

  function handleValidate() {
    if (!watchMetaPageId || !watchMetaToken) return
    validate.mutate({
      pageId: watchMetaPageId,
      token: watchMetaToken,
      channelType,
    })
  }

  return (
    <>
      <FormField
        label="Page ID"
        error={errors.metaPageId?.message}
        helperText={pageIdHelper}
        required
      >
        <Input placeholder="ID da página Meta" {...register('metaPageId')} />
      </FormField>

      <FormField
        label="Token"
        error={errors.metaToken?.message}
        helperText="Page Access Token. Gere em Meta for Developers > seu App > Messenger > Tokens de Acesso."
        required
      >
        <Input
          type="password"
          placeholder="Token de acesso da página"
          {...register('metaToken')}
        />
      </FormField>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleValidate}
          disabled={!watchMetaPageId || !watchMetaToken || validate.isPending}
        >
          {validate.isPending ? (
            <Loader2 className="mr-2 size-3 animate-spin" />
          ) : null}
          Testar Conexão
        </Button>
        {validate.isSuccess && (
          <span className="text-sm text-green-600">
            Conectado:{' '}
            {validate.data.username
              ? `@${validate.data.username}`
              : validate.data.name}
          </span>
        )}
        {validate.isError && (
          <span className="text-destructive text-sm">Falha na validação</span>
        )}
      </div>
    </>
  )
}

export function getNamePlaceholder(channelType: ChannelType): string {
  const placeholders: Record<ChannelType, string> = {
    WHATSAPP: 'Ex: WhatsApp Principal',
    WEB_CHAT: 'Ex: Chat do Site',
    MESSENGER: 'Ex: Messenger Empresa',
    INSTAGRAM: 'Ex: Instagram Empresa',
  }
  return placeholders[channelType]
}

export function buildCreatePayload(
  values: ChannelFormValues
): CreateChannelPayload {
  const base = { name: values.name }

  if (values.channelType === 'WHATSAPP') {
    return {
      ...base,
      type: 'WHATSAPP',
      brokerType: values.brokerType ?? 'BAILEYS',
      phoneNumber: values.phoneNumber,
      ...(values.brokerType === 'META'
        ? { metaToken: values.metaToken, phoneNumberId: values.phoneNumberId }
        : {}),
    }
  }

  if (values.channelType === 'WEB_CHAT') {
    return {
      ...base,
      type: 'WEB_CHAT',
      brokerType: 'WEB_CHAT',
      config: {
        widgetColor: values.widgetColor,
        welcomeMessage: values.welcomeMessage,
        allowedOrigins: values.allowedOrigins
          ?.split(',')
          .map((o) => o.trim())
          .filter(Boolean),
      },
    }
  }

  return {
    ...base,
    type: values.channelType,
    brokerType: values.channelType,
    config: {
      metaPageId: values.metaPageId,
      metaToken: values.metaToken,
    },
  }
}
