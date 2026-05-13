import type { ContactSource, ContactStage } from './types'

export const CONTACT_SOURCE_LABELS: Record<ContactSource, string> = {
  MANUAL: 'Manual',
  CHAT_WHATSAPP: 'WhatsApp',
  CHAT_WIDGET: 'Widget',
  FORM_WEB: 'Formulário web',
  IMPORT: 'Importação',
  REFERRAL: 'Indicação',
}

export const STAGE_LABELS: Record<ContactStage, string> = {
  LEAD: 'Lead',
  CLIENT_NEW: 'Cliente novo',
  CLIENT_ACTIVE: 'Cliente ativo',
  CLIENT_INACTIVE: 'Ex-cliente',
}

interface SelectOption<TValue extends string> {
  readonly value: TValue
  readonly label: string
}

export const CONTACT_SOURCE_OPTIONS: readonly SelectOption<ContactSource>[] = [
  { value: 'MANUAL', label: CONTACT_SOURCE_LABELS.MANUAL },
  { value: 'CHAT_WHATSAPP', label: CONTACT_SOURCE_LABELS.CHAT_WHATSAPP },
  { value: 'CHAT_WIDGET', label: CONTACT_SOURCE_LABELS.CHAT_WIDGET },
  { value: 'FORM_WEB', label: CONTACT_SOURCE_LABELS.FORM_WEB },
  { value: 'IMPORT', label: CONTACT_SOURCE_LABELS.IMPORT },
  { value: 'REFERRAL', label: CONTACT_SOURCE_LABELS.REFERRAL },
] as const

export const CONTACT_STAGE_OPTIONS: readonly SelectOption<ContactStage>[] = [
  { value: 'LEAD', label: STAGE_LABELS.LEAD },
  { value: 'CLIENT_NEW', label: STAGE_LABELS.CLIENT_NEW },
  { value: 'CLIENT_ACTIVE', label: STAGE_LABELS.CLIENT_ACTIVE },
  { value: 'CLIENT_INACTIVE', label: STAGE_LABELS.CLIENT_INACTIVE },
] as const

export const PERSON_TYPE_OPTIONS = [
  { value: 'INDIVIDUAL', label: 'Pessoa Física (CPF)' },
  { value: 'COMPANY', label: 'Pessoa Jurídica (CNPJ)' },
] as const
