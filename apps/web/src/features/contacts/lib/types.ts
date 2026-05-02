import type { z } from 'zod'

import type {
  CreateContactBody as CreateContactBodySchema,
  PromoteContactBody as PromoteContactBodySchema,
  UpdateContactBody as UpdateContactBodySchema,
} from '@/api/endpoints/contacts/contacts.zod'
import type {
  GetContact200Data,
  ListContacts200DataItem,
  ListContacts200DataItemSource,
  ListContacts200DataItemStage,
} from '@/api/model'

export type ContactStage = ListContacts200DataItemStage
export type ContactSource = ListContacts200DataItemSource
export type ContactWithStage = GetContact200Data
export type ContactListItem = ListContacts200DataItem

export type CreateContactValues = z.infer<typeof CreateContactBodySchema>
export type UpdateContactValues = z.infer<typeof UpdateContactBodySchema>
export type PromoteContactValues = z.infer<typeof PromoteContactBodySchema>
