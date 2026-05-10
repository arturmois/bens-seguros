'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form'

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { PromoteContactBody as PromoteContactSchema } from '@/api/endpoints/contacts/contacts.zod'

import { usePromoteContact } from '../hooks/use-contacts'
import { PERSON_TYPE_OPTIONS } from '../lib/constants'
import type { PromoteContactValues } from '../lib/types'

interface PromoteContactDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly contactId: string
  readonly defaultLegalName?: string
  readonly onPromoted?: (clientId: string) => void
}

export function PromoteContactDialog({
  open,
  onOpenChange,
  contactId,
  defaultLegalName,
  onPromoted,
}: PromoteContactDialogProps) {
  const promoteMutation = usePromoteContact()
  const form = useForm<PromoteContactValues>({
    resolver: zodResolver(PromoteContactSchema),
    mode: 'onBlur',
    defaultValues: {
      document: '',
      legalName: defaultLegalName ?? '',
      personType: 'INDIVIDUAL',
    },
  })
  const personType = useWatch({ control: form.control, name: 'personType' })
  const isCompany = personType === 'COMPANY'
  function handleSubmit(values: PromoteContactValues) {
    promoteMutation.mutate(
      { id: contactId, data: values },
      {
        onSuccess: (response) => {
          const responseBody = response.data
          if ('data' in responseBody && responseBody.data?.clientId) {
            onPromoted?.(responseBody.data.clientId)
          }
          form.reset({
            document: '',
            legalName: defaultLegalName ?? '',
            personType: 'INDIVIDUAL',
          })
          onOpenChange(false)
        },
      }
    )
  }
  function handleOpenChange(next: boolean) {
    if (!next) form.clearErrors()
    onOpenChange(next)
  }
  const errors = form.formState.errors
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Promover a cliente</DialogTitle>
          <DialogDescription>
            Informe o CPF ou CNPJ do contato. Se já existir um cliente com este
            documento, o vínculo será automático.
          </DialogDescription>
        </DialogHeader>
        <DialogPanel>
          <FormProvider {...form}>
            <form
              id="promote-contact-form"
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-4"
              noValidate
            >
              <FormField
                label="Tipo"
                error={errors.personType?.message}
                required
              >
                <Controller
                  control={form.control}
                  name="personType"
                  render={({ field }) => (
                    <Select
                      value={field.value ?? 'INDIVIDUAL'}
                      onValueChange={(value) => {
                        if (value !== null) field.onChange(value)
                      }}
                      items={PERSON_TYPE_OPTIONS}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione">
                          {(value: string | null) => {
                            const item = PERSON_TYPE_OPTIONS.find(
                              (option) => option.value === value
                            )
                            return item?.label ?? null
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {PERSON_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
              <FormField
                label={isCompany ? 'CNPJ' : 'CPF'}
                error={errors.document?.message}
                required
              >
                <Input
                  placeholder="Apenas números"
                  inputMode="numeric"
                  {...form.register('document')}
                />
              </FormField>
              <FormField
                label={isCompany ? 'Razão social' : 'Nome legal'}
                error={errors.legalName?.message}
              >
                <Input
                  placeholder={
                    isCompany
                      ? 'Razão social da empresa'
                      : 'Nome completo do titular'
                  }
                  {...form.register('legalName')}
                />
              </FormField>
            </form>
          </FormProvider>
        </DialogPanel>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={promoteMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="promote-contact-form"
            disabled={promoteMutation.isPending}
          >
            {promoteMutation.isPending && (
              <Loader2 className="mr-2 size-4 animate-spin" />
            )}
            Promover a cliente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
