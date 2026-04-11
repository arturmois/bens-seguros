import type { VisibilityState } from '@tanstack/react-table'

interface FilterTabOption {
  readonly value: string
  readonly label: string
}

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

export const ACTION_FILTER_OPTIONS: readonly FilterTabOption[] = [
  { value: '', label: 'Todas' },
  { value: 'CREATE', label: 'Criar' },
  { value: 'UPDATE', label: 'Atualizar' },
  { value: 'DELETE', label: 'Excluir' },
  { value: 'APPROVE', label: 'Aprovar' },
  { value: 'REJECT', label: 'Rejeitar' },
] as const

export const ENTITY_TYPE_OPTIONS = [
  { value: 'ALL', label: 'Todas entidades' },
  { value: 'Client', label: 'Cliente' },
  { value: 'Proposal', label: 'Proposta' },
  { value: 'Policy', label: 'Apólice' },
  { value: 'Claim', label: 'Sinistro' },
  { value: 'Commission', label: 'Comissão' },
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
