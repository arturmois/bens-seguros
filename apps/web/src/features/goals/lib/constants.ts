import type {
  GetGoalsProgress200Data,
  GetGoalsProgress200DataEntriesItem,
  GetGoalsProgress200DataEntriesItemBoardType,
} from '@/api/model'

export type GoalsProgress = GetGoalsProgress200Data
export type GoalProgressEntry = GetGoalsProgress200DataEntriesItem
export type GoalBoardType = GetGoalsProgress200DataEntriesItemBoardType

export const MONTH_LABELS: readonly string[] = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

export const BOARD_TYPE_LABEL: Record<GoalBoardType, string> = {
  NEW_INSURANCE: 'Seguro Novo',
  RENEWAL: 'Renovação',
}

export const BOARD_TYPE_KEYS: readonly GoalBoardType[] = [
  'NEW_INSURANCE',
  'RENEWAL',
]

export function getDefaultYear(): number {
  return new Date().getFullYear()
}

export function getAvailableYears(): readonly number[] {
  const current = getDefaultYear()
  return [current - 2, current - 1, current, current + 1, current + 2]
}
