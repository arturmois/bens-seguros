import { z } from 'zod'

import type { ChannelType } from '@/features/chat/types'

export const FORM_BROKER_TYPES = ['BAILEYS', 'META'] as const
export type FormBrokerType = (typeof FORM_BROKER_TYPES)[number]

export const CHANNEL_TYPE_OPTIONS = [
  'WHATSAPP',
  'WEB_CHAT',
  'MESSENGER',
  'INSTAGRAM',
] as const

export const channelFormSchema = z
  .object({
    channelType: z.enum(CHANNEL_TYPE_OPTIONS, {
      required_error: 'Tipo de canal é obrigatório',
    }),
    name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
    brokerType: z.enum([...FORM_BROKER_TYPES, 'WEB_CHAT'] as const).optional(),
    phoneNumber: z.string().optional(),
    metaToken: z.string().optional(),
    phoneNumberId: z.string().optional(),
    metaPageId: z.string().optional(),
    metaAppId: z.string().optional(),
    metaAppSecret: z.string().optional(),
    widgetColor: z.string().optional(),
    welcomeMessage: z.string().optional(),
    allowedOrigins: z.string().optional(),
    aiAgentId: z.string().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.channelType === 'WHATSAPP' && data.brokerType === 'META') {
      if (!data.metaToken || data.metaToken.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Token é obrigatório para conexão Meta',
          path: ['metaToken'],
        })
      }
      if (!data.phoneNumberId || data.phoneNumberId.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Phone Number ID é obrigatório para conexão Meta',
          path: ['phoneNumberId'],
        })
      }
    }

    if (data.channelType === 'MESSENGER' || data.channelType === 'INSTAGRAM') {
      if (!data.metaPageId || data.metaPageId.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Page ID é obrigatório',
          path: ['metaPageId'],
        })
      }
      if (!data.metaToken || data.metaToken.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Token é obrigatório',
          path: ['metaToken'],
        })
      }
    }

    const needsMetaApp =
      data.channelType === 'MESSENGER' ||
      data.channelType === 'INSTAGRAM' ||
      (data.channelType === 'WHATSAPP' && data.brokerType === 'META')

    if (needsMetaApp) {
      if (!data.metaAppId || data.metaAppId.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'App ID é obrigatório para canais Meta',
          path: ['metaAppId'],
        })
      }
      if (!data.metaAppSecret || data.metaAppSecret.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'App Secret é obrigatório para canais Meta',
          path: ['metaAppSecret'],
        })
      }
    }
  })

export type ChannelFormValues = z.infer<typeof channelFormSchema>

export function buildEmptyChannelForm(
  channelType: ChannelType = 'WHATSAPP'
): ChannelFormValues {
  return {
    channelType,
    name: '',
    brokerType: 'BAILEYS',
    phoneNumber: '',
    metaToken: '',
    phoneNumberId: '',
    metaPageId: '',
    metaAppId: '',
    metaAppSecret: '',
    widgetColor: '#1f4b5f',
    welcomeMessage: '',
    allowedOrigins: '',
    aiAgentId: null,
  }
}

export const EMPTY_CHANNEL_FORM: ChannelFormValues = buildEmptyChannelForm()
