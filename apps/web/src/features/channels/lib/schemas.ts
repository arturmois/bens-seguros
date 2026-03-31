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

export const channelFormSchema = z.object({
  channelType: z.enum(CHANNEL_TYPE_OPTIONS, {
    required_error: 'Tipo de canal é obrigatório',
  }),
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  brokerType: z.enum([...FORM_BROKER_TYPES, 'WEB_CHAT'] as const).optional(),
  phoneNumber: z.string().optional(),
  widgetColor: z.string().optional(),
  welcomeMessage: z.string().optional(),
  allowedOrigins: z.string().optional(),
  aiAgentId: z.string().nullable().optional(),
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
    widgetColor: '#1f4b5f',
    welcomeMessage: '',
    allowedOrigins: '',
    aiAgentId: null,
  }
}

export const EMPTY_CHANNEL_FORM: ChannelFormValues = buildEmptyChannelForm()
