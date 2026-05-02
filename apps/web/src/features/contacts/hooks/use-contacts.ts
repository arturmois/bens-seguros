'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  createContact,
  deleteContact,
  getGetContactQueryKey,
  getListContactsQueryKey,
  promoteContact,
  updateContact,
  useGetContact,
  useListContacts,
} from '@/api/endpoints/contacts/contacts'
import type {
  CreateContactBody,
  ListContacts200DataItem,
  ListContacts200Meta,
  ListContactsParams,
  PromoteContactBody,
  UpdateContactBody,
} from '@/api/model'

import { extractErrorMessage } from '@/lib/extract-error-message'

interface ContactsQueryData {
  readonly data: ListContacts200DataItem[]
  readonly meta: ListContacts200Meta
}

const EMPTY_CONTACTS_DATA: ContactsQueryData = {
  data: [],
  meta: { nextCursor: null },
}

export function useContacts(params: ListContactsParams) {
  return useListContacts<ContactsQueryData>(params, {
    query: {
      select: (response) =>
        'data' in response.data && Array.isArray(response.data.data)
          ? { data: response.data.data, meta: response.data.meta }
          : EMPTY_CONTACTS_DATA,
    },
  })
}

export function useContact(id: string) {
  return useGetContact(id, {
    query: {
      enabled: id.length > 0,
      select: (response) =>
        'data' in response.data ? response.data.data : undefined,
    },
  })
}

export function useCreateContact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateContactBody) => createContact(data),
    onSuccess: () => {
      toast.success('Contato criado com sucesso')
      void queryClient.invalidateQueries({
        queryKey: getListContactsQueryKey(),
      })
    },
    onError: (error) => {
      const message = extractErrorMessage(error, 'Erro ao criar contato')
      toast.error(message)
    },
  })
}

export function useUpdateContact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateContactBody }) =>
      updateContact(id, data),
    onSuccess: (_response, variables) => {
      toast.success('Contato atualizado com sucesso')
      void queryClient.invalidateQueries({
        queryKey: getListContactsQueryKey(),
      })
      void queryClient.invalidateQueries({
        queryKey: getGetContactQueryKey(variables.id),
      })
    },
    onError: (error) => {
      const message = extractErrorMessage(error, 'Erro ao atualizar contato')
      toast.error(message)
    },
  })
}

export function useDeleteContact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteContact(id),
    onSuccess: () => {
      toast.success('Contato removido')
      void queryClient.invalidateQueries({
        queryKey: getListContactsQueryKey(),
      })
    },
    onError: (error) => {
      const message = extractErrorMessage(error, 'Erro ao remover contato')
      toast.error(message)
    },
  })
}

export function usePromoteContact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: PromoteContactBody }) =>
      promoteContact(id, data),
    onSuccess: (_response, variables) => {
      toast.success('Contato promovido a cliente')
      void queryClient.invalidateQueries({
        queryKey: getListContactsQueryKey(),
      })
      void queryClient.invalidateQueries({
        queryKey: getGetContactQueryKey(variables.id),
      })
    },
    onError: (error) => {
      const message = extractErrorMessage(error, 'Erro ao promover contato')
      toast.error(message)
    },
  })
}
