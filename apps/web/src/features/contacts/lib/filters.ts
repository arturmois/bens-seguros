import { Calendar, Check, Circle, User } from 'lucide-react'
import type { FilterDefinition } from '@/components/shared/filter-types'
import { useSalespersonOptions } from '../hooks/use-salesperson-options'
import { CONTACT_SOURCE_OPTIONS, CONTACT_STAGE_OPTIONS } from './constants'

export const CONTACT_FILTERS: readonly FilterDefinition[] = [
  {
    key: 'stageIn',
    label: 'Estágio',
    icon: Circle,
    type: 'enum',
    options: CONTACT_STAGE_OPTIONS,
  },
  {
    key: 'sourceIn',
    label: 'Origem',
    icon: Circle,
    type: 'enum',
    options: CONTACT_SOURCE_OPTIONS,
  },
  {
    key: 'salespersonIdIn',
    label: 'Vendedor',
    icon: User,
    type: 'enum',
    useOptions: useSalespersonOptions,
  },
  {
    key: 'createdAt',
    apiKey: 'created',
    label: 'Data de criação',
    icon: Calendar,
    type: 'dateRange',
  },
  // tagsIn — postergado. Depende de novo endpoint GET /v1/contacts/tags
  //   pra listar valores distintos de Contact.tags. Plano separado.
  {
    key: 'consentLgpd',
    label: 'Consentimento LGPD',
    icon: Check,
    type: 'boolean',
  },
] as const
