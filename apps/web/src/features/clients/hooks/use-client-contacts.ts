'use client'

import { useListContacts } from '@/api/endpoints/contacts/contacts'
import type {
  ListContacts200DataItem,
  ListContacts200Meta,
  ListContactsParams,
} from '@/api/model'

interface ClientContactsQueryData {
  readonly data: ListContacts200DataItem[]
  readonly meta: ListContacts200Meta
}

const EMPTY: ClientContactsQueryData = {
  data: [],
  meta: { nextCursor: null },
}

type ContactsParamsWithoutClient = Omit<ListContactsParams, 'clientId'>

export function useClientContacts(
  clientId: string,
  args: ContactsParamsWithoutClient = {}
) {
  return useListContacts<ClientContactsQueryData>(
    { ...args, clientId, limit: args.limit ?? 10 },
    {
      query: {
        enabled: Boolean(clientId),
        select: (response) =>
          'data' in response.data && Array.isArray(response.data.data)
            ? { data: response.data.data, meta: response.data.meta }
            : EMPTY,
      },
    }
  )
}
