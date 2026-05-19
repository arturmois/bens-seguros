'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'

import type { ListInsurers200DataItem } from '@/api/model'
import { FormActions } from '@/components/shared/form-actions'
import { FormField } from '@/components/shared/form-field'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

import {
  useCreateInsurerMutation,
  useUpdateInsurerMutation,
} from '../hooks/use-insurers'
import {
  DEFAULT_INSURER_FORM,
  insurerFormSchema,
  type InsurerFormValues,
} from '../lib/schemas'

interface InsurerFormDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly insurer?: ListInsurers200DataItem
  readonly onSuccess?: (insurer: ListInsurers200DataItem) => void
}

export function InsurerFormDialog({
  open,
  onOpenChange,
  insurer,
  onSuccess,
}: InsurerFormDialogProps) {
  const isEditMode = Boolean(insurer)
  const createMutation = useCreateInsurerMutation()
  const updateMutation = useUpdateInsurerMutation()
  const isPending = createMutation.isPending || updateMutation.isPending
  const form = useForm<InsurerFormValues>({
    resolver: zodResolver(insurerFormSchema),
    defaultValues: DEFAULT_INSURER_FORM,
  })
  useEffect(() => {
    if (!open) return
    if (insurer) {
      form.reset({
        name: insurer.name,
        code: insurer.code ?? '',
        active: insurer.active,
      })
      return
    }
    form.reset(DEFAULT_INSURER_FORM)
  }, [open, insurer, form])
  function handleSubmit(values: InsurerFormValues) {
    if (isEditMode && insurer) {
      updateMutation.mutate(
        { id: insurer.id, body: values },
        {
          onSuccess: (updated) => {
            onSuccess?.(updated)
            onOpenChange(false)
          },
        }
      )
      return
    }
    createMutation.mutate(values, {
      onSuccess: (created) => {
        onSuccess?.(created)
        onOpenChange(false)
      },
    })
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Editar seguradora' : 'Nova seguradora'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Atualize os dados da seguradora.'
              : 'Cadastre uma seguradora para uso em propostas, apólices e sinistros.'}
          </DialogDescription>
        </DialogHeader>
        <DialogPanel>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
            id="insurer-form"
          >
            <FormField
              label="Nome da seguradora"
              error={form.formState.errors.name?.message}
              required
            >
              <Input
                placeholder="Ex: Porto Seguro"
                {...form.register('name')}
              />
            </FormField>
            <FormField
              label="Código"
              error={form.formState.errors.code?.message}
              hint="Opcional. Use quando a operação precisar de um código interno."
            >
              <Input placeholder="Ex: PSEG" {...form.register('code')} />
            </FormField>
            {isEditMode && (
              <Controller
                name="active"
                control={form.control}
                render={({ field }) => (
                  <div className="border-border flex items-center justify-between rounded-lg border p-4">
                    <Label htmlFor="insurer-active" className="cursor-pointer">
                      Ativa
                    </Label>
                    <Switch
                      id="insurer-active"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </div>
                )}
              />
            )}
          </form>
        </DialogPanel>
        <DialogFooter>
          <FormActions noPadding>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" form="insurer-form" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {isEditMode ? 'Salvar' : 'Criar seguradora'}
            </Button>
          </FormActions>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
