import type { LucideIcon } from 'lucide-react'

export interface FilterOption {
  readonly value: string
  readonly label: string
}

export type FilterType = 'enum' | 'dateRange' | 'boolean'

export interface FilterDefinitionEnum {
  readonly key: string
  readonly apiKey?: string
  readonly label: string
  readonly icon: LucideIcon
  readonly type: 'enum'
  readonly options?: readonly FilterOption[]
  readonly useOptions?: () => {
    readonly options: readonly FilterOption[]
    readonly isLoading: boolean
  }
}

export interface FilterDefinitionDateRange {
  readonly key: string
  readonly apiKey?: string
  readonly label: string
  readonly icon: LucideIcon
  readonly type: 'dateRange'
}

export interface FilterDefinitionBoolean {
  readonly key: string
  readonly apiKey?: string
  readonly label: string
  readonly icon: LucideIcon
  readonly type: 'boolean'
}

export type FilterDefinition =
  | FilterDefinitionEnum
  | FilterDefinitionDateRange
  | FilterDefinitionBoolean

export interface DateRangeValue {
  readonly preset: string
  readonly from?: string
  readonly to?: string
}

export type FilterValue =
  | readonly string[]
  | DateRangeValue
  | boolean
  | undefined
