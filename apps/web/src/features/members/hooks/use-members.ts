'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ApiError } from '@/lib/api-client'
import {
  useListMembers,
  updateMemberRole,
  deactivateMember,
  getListMembersQueryKey,
} from '@/api/endpoints/members/members'
import type {
  UpdateMemberRoleBody,
  UpdateMemberRoleBodyRole,
} from '@/api/model'
import {
  useListInvitations,
  createInvitation,
  revokeInvitation,
  getListInvitationsQueryKey,
} from '@/api/endpoints/invitations/invitations'
import type {
  CreateInvitationBody,
  CreateInvitationBodyRole,
} from '@/api/model'

const MEMBERS_KEY = getListMembersQueryKey()
const INVITATIONS_KEY = getListInvitationsQueryKey()

export function useMembers() {
  return useListMembers(undefined, {
    query: {
      select: (response) => response.data.data,
    },
  })
}

export function useInvitations() {
  return useListInvitations(undefined, {
    query: {
      select: (response) => response.data.data,
    },
  })
}

export function useInviteMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: {
      email: string
      role: CreateInvitationBodyRole
    }) => {
      return createInvitation(payload satisfies CreateInvitationBody)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEMBERS_KEY })
      queryClient.invalidateQueries({ queryKey: INVITATIONS_KEY })
      toast.success('Convite enviado com sucesso')
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === 'DUPLICATE_INVITATION') {
        toast.error('Email já é membro ou tem convite pendente')
        return
      }
      toast.error('Erro ao enviar convite')
    },
  })
}

export function useChangeMemberRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      role,
    }: {
      id: string
      role: UpdateMemberRoleBodyRole
    }) => {
      return updateMemberRole(id, { role } satisfies UpdateMemberRoleBody)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEMBERS_KEY })
      toast.success('Cargo atualizado')
    },
    onError: (error) => {
      if (!(error instanceof ApiError)) {
        toast.error('Erro ao alterar cargo')
        return
      }

      if (error.code === 'ROLE_HIERARCHY_VIOLATION') {
        toast.error('Você não pode atribuir um cargo igual ou superior ao seu')
        return
      }

      if (error.code === 'LAST_OWNER') {
        toast.error('Não é possível rebaixar o último proprietário')
        return
      }

      if (error.code === 'SELF_REMOVAL') {
        toast.error('Você não pode alterar seu próprio cargo')
        return
      }

      toast.error('Erro ao alterar cargo')
    },
  })
}

export function useRemoveMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await deactivateMember(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEMBERS_KEY })
      toast.success('Membro removido')
    },
    onError: (error) => {
      if (!(error instanceof ApiError)) {
        toast.error('Erro ao remover membro')
        return
      }

      if (error.code === 'LAST_OWNER') {
        toast.error('Não é possível remover o último proprietário')
        return
      }

      if (error.code === 'SELF_REMOVAL') {
        toast.error('Você não pode se remover da organização')
        return
      }

      if (error.code === 'ROLE_HIERARCHY_VIOLATION') {
        toast.error(
          'Você não pode remover um membro com cargo igual ou superior ao seu'
        )
        return
      }

      toast.error('Erro ao remover membro')
    },
  })
}

export function useRevokeInvitation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await revokeInvitation(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVITATIONS_KEY })
      toast.success('Convite revogado')
    },
    onError: () => {
      toast.error('Erro ao revogar convite')
    },
  })
}
