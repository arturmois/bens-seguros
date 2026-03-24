'use client'

import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

import { useInviteMember } from '../hooks/use-members'
import {
  ASSIGNABLE_ROLES,
  inviteMemberSchema,
  type InviteMemberFormValues,
  ROLE_HIERARCHY,
  ROLE_LABELS,
} from '../lib/member-schemas'

interface InviteMemberDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly currentUserRole: string
}

function getAssignableRolesForCaller(callerRole: string) {
  const callerLevel = ROLE_HIERARCHY[callerRole] ?? 0
  return ASSIGNABLE_ROLES.filter(
    (role) => (ROLE_HIERARCHY[role] ?? 0) < callerLevel
  )
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
    resolver: zodResolver(inviteMemberSchema),
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Convidar Membro</SheetTitle>
          <SheetDescription>
            Envie um convite por email para adicionar um novo membro a equipe.
          </SheetDescription>
        </SheetHeader>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="mt-6 space-y-4 px-6"
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
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={inviteMember.isPending}>
              {inviteMember.isPending && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              Enviar Convite
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
