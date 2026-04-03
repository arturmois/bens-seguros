'use client'

import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import type { ListInsurers200DataItem } from '@/api/model'

import {
  DEFAULT_INSURER_FORM,
  insurerFormSchema,
  type InsurerFormValues,
} from '../lib/schemas'
import {
  useCreateInsurerMutation,
  useUpdateInsurerMutation,
} from '../hooks/use-insurers'

interface InsurerFormSheetProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly insurer?: ListInsurers200DataItem
  readonly onSuccess?: (insurer: ListInsurers200DataItem) => void
}

export function InsurerFormSheet({
  open,
  onOpenChange,
  insurer,
  onSuccess,
}: InsurerFormSheetProps) {
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
        {
          id: insurer.id,
          body: values,
        },
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {isEditMode ? 'Editar seguradora' : 'Nova seguradora'}
          </SheetTitle>
          <SheetDescription>
            {isEditMode
              ? 'Atualize os dados da seguradora.'
              : 'Cadastre uma seguradora para uso em propostas, apólices e sinistros.'}
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="mt-6 space-y-4 px-6"
        >
          <FormField
            label="Nome da seguradora"
            error={form.formState.errors.name?.message}
            required
          >
            <Input placeholder="Ex: Porto Seguro" {...form.register('name')} />
          </FormField>

          <FormField
            label="Código"
            error={form.formState.errors.code?.message}
            helperText="Opcional. Use quando a operação precisar de um código interno."
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

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {isEditMode ? 'Salvar' : 'Criar seguradora'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
