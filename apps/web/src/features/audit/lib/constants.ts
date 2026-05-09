import type { VisibilityState } from '@tanstack/react-table'

interface HideableColumn {
  readonly id: string
  readonly label: string
}

export const DEFAULT_COLUMN_VISIBILITY: VisibilityState = {
  entityId: false,
}

export const HIDEABLE_COLUMNS: readonly HideableColumn[] = [
  { id: 'entityType', label: 'Entidade' },
  { id: 'entityId', label: 'ID' },
] as const

export const ACTION_VARIANT: Record<
  string,
  'default' | 'success' | 'error' | 'warning' | 'info'
> = {
  CREATE: 'success',
  UPDATE: 'info',
  DELETE: 'error',
  APPROVE: 'success',
  REJECT: 'warning',
}

export const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Criação',
  UPDATE: 'Atualização',
  DELETE: 'Exclusão',
  APPROVE: 'Aprovação',
  REJECT: 'Rejeição',
}

export const ENTITY_TYPE_LABELS: Record<string, string> = {
  Client: 'Cliente',
  Proposal: 'Proposta',
  Policy: 'Apólice',
  Claim: 'Sinistro',
  Commission: 'Comissão',
}
