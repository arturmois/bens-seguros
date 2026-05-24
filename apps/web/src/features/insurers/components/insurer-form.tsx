'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Controller, FormProvider, useForm } from 'react-hook-form'

import type { ListInsurers200DataItem } from '@/api/model'
import { FormActions } from '@/components/shared/form-actions'
import { FormField } from '@/components/shared/form-field'
import { FormGrid } from '@/components/shared/form-grid'
import { FormSection } from '@/components/shared/form-section'
import { Button } from '@/components/ui/button'
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

interface InsurerFormProps {
  readonly mode?: 'create' | 'edit'
  readonly initial?: ListInsurers200DataItem
  readonly onSuccess?: (insurer: ListInsurers200DataItem) => void
  readonly onCancel?: () => void
  readonly onPendingChange?: (pending: boolean) => void
  readonly hideFooter?: boolean
  readonly formId?: string
}

function buildDefaultValues(
  initial?: ListInsurers200DataItem
): InsurerFormValues {
  if (!initial) return DEFAULT_INSURER_FORM
  return {
    name: initial.name,
    code: initial.code ?? '',
    active: initial.active,
  }
}

export function InsurerForm({
  mode = 'create',
  initial,
  onSuccess,
  onCancel,
  onPendingChange,
  hideFooter,
  formId,
}: InsurerFormProps) {
  const router = useRouter()
  const createMutation = useCreateInsurerMutation()
  const updateMutation = useUpdateInsurerMutation()
  const isPending = createMutation.isPending || updateMutation.isPending
  const isEdit = mode === 'edit'
  const form = useForm<InsurerFormValues>({
    resolver: zodResolver(insurerFormSchema),
    mode: 'onBlur',
    values: buildDefaultValues(initial),
    resetOptions: { keepDirtyValues: true },
  })
  useEffect(() => {
    onPendingChange?.(isPending)
  }, [isPending, onPendingChange])
  function handleSubmit(values: InsurerFormValues) {
    if (isEdit && initial) {
      updateMutation.mutate(
        { id: initial.id, body: values },
        {
          onSuccess: (updated) => {
            if (onSuccess) {
              onSuccess(updated)
              return
            }
            router.push('/insurers')
          },
        }
      )
      return
    }
    createMutation.mutate(values, {
      onSuccess: (created) => {
        if (onSuccess) {
          onSuccess(created)
          return
        }
        router.push('/insurers')
      },
    })
  }
  function handleCancel() {
    if (onCancel) {
      onCancel()
      return
    }
    router.push('/insurers')
  }
  const errors = form.formState.errors
  return (
    <FormProvider {...form}>
      <form
        id={formId}
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-8"
        noValidate
      >
        <FormSection title="Identificação">
          <FormGrid columns={2}>
            <FormField
              label="Nome da seguradora"
              error={errors.name?.message}
              required
            >
              <Input
                placeholder="Ex: Porto Seguro"
                {...form.register('name')}
              />
            </FormField>
            <FormField
              label="Código"
              error={errors.code?.message}
              hint="Opcional. Use quando a operação precisar de um código interno."
            >
              <Input placeholder="Ex: PSEG" {...form.register('code')} />
            </FormField>
          </FormGrid>
        </FormSection>
        {isEdit && (
          <FormSection title="Status">
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
          </FormSection>
        )}
        {!hideFooter && (
          <FormActions>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isEdit ? 'Salvar alterações' : 'Criar seguradora'}
            </Button>
          </FormActions>
        )}
      </form>
    </FormProvider>
  )
}
