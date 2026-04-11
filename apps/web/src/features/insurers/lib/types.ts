import type {
  CreateInsurerBody,
  ListInsurers200DataItem,
  ListInsurers200Meta,
  ListInsurersParams,
  UpdateInsurerBody,
} from '@/api/model'

export type InsurerData = ListInsurers200DataItem
export type InsurerListMeta = ListInsurers200Meta
export type InsurerListParams = ListInsurersParams
export type InsurerCreateBody = CreateInsurerBody
export type InsurerUpdateBody = UpdateInsurerBody

export type InsurerStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE'

export interface InsurersListData {
  readonly data: readonly InsurerData[]
  readonly meta: InsurerListMeta
}
