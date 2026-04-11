'use client'

import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogTitle,
} from '@/components/ui/dialog'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import type { z } from 'zod'

import { CreateInvitationBody } from '@/api/endpoints/invitations/invitations.zod'

import { useInviteMember } from '../hooks/use-members'
import {
  ASSIGNABLE_ROLES,
  getRoleLevel,
  ROLE_LABELS,
} from '../lib/member-schemas'

type InviteMemberFormValues = z.infer<typeof CreateInvitationBody>

interface InviteMemberDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly currentUserRole: string
}

function getAssignableRolesForCaller(callerRole: string) {
  const callerLevel = getRoleLevel(callerRole)
  return ASSIGNABLE_ROLES.filter((role) => getRoleLevel(role) < callerLevel)
}

const DEFAULT_VALUES: InviteMemberFormValues = {
  email: '',
  role: 'COMMERCIAL',
}

export function InviteMemberDialog({
  open,
  onOpenChange,
  currentUserRole,
}: InviteMemberDialogProps) {
  const inviteMember = useInviteMember()

  const form = useForm<InviteMemberFormValues>({
    resolver: zodResolver(CreateInvitationBody),
    defaultValues: DEFAULT_VALUES,
  })

  useEffect(() => {
    if (!open) return
    form.reset(DEFAULT_VALUES)
  }, [open, form])

  const availableRoles = getAssignableRolesForCaller(currentUserRole)

  function handleSubmit(values: InviteMemberFormValues) {
    inviteMember.mutate(values, {
      onSuccess: () => {
        form.reset(DEFAULT_VALUES)
        onOpenChange(false)
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Convidar membro</DialogTitle>
          <DialogDescription>
            Envie um convite por email para adicionar um novo membro à equipe.
          </DialogDescription>
        </DialogHeader>

        <DialogPanel>
          <form
            id="invite-member-form"
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              label="Email"
              error={form.formState.errors.email?.message}
              required
            >
              <Input
                type="email"
                placeholder="colaborador@empresa.com"
                {...form.register('email')}
              />
            </FormField>
            <FormField
              label="Cargo"
              error={form.formState.errors.role?.message}
              required
            >
              <Controller
                name="role"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cargo" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map((role) => (
                        <SelectItem key={role} value={role}>
                          {ROLE_LABELS[role] ?? role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          </form>
        </DialogPanel>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="invite-member-form"
            disabled={inviteMember.isPending}
          >
            {inviteMember.isPending && (
              <Loader2 className="mr-2 size-4 animate-spin" />
            )}
            Enviar convite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
