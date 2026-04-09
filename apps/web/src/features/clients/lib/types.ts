import type { z } from 'zod'

import type { CreateClientBody } from '@/api/endpoints/clients/clients.zod'
import type {
  GetClient200Data,
  ListClients200DataItem,
  ListClients200DataItemType,
} from '@/api/model'

export type ClientFormValues = z.infer<typeof CreateClientBody>
export type ClientType = ListClients200DataItemType
export type MaritalStatus =
  | 'SINGLE'
  | 'MARRIED'
  | 'DIVORCED'
  | 'WIDOWED'
  | 'OTHER'
export type ClientData = ListClients200DataItem
export type ClientDetail = GetClient200Data

export interface ClientFilters {
  readonly search?: string
  readonly type?: ClientType
  readonly cursor?: string
  readonly limit?: number
}
