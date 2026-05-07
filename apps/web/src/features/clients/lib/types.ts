import type {
  CreateClientBody,
  GetClient200Data,
  ListClients200DataItem,
  ListClients200DataItemPersonType,
} from '@/api/model'

export type ClientPersonType = ListClients200DataItemPersonType
export type ClientData = ListClients200DataItem
export type ClientDetail = GetClient200Data

export interface ClientFilters {
  readonly search?: string
  readonly personTypeIn?: string
  readonly hasActivePolicy?: 'true' | 'false'
  readonly cursor?: string
  readonly limit?: number
}

export type ClientFormValues = CreateClientBody
