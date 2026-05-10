'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { FormProvider, useForm } from 'react-hook-form'
import { z } from 'zod'

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

import { useCreateContact } from '../hooks/use-contacts'

const QuickCreateSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório'),
  phone: z.string().trim().min(1, 'Telefone é obrigatório'),
})
type QuickCreateValues = z.infer<typeof QuickCreateSchema>

interface QuickCreateContactProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onCreated: (contactId: string) => void
}

const EMPTY_VALUES: QuickCreateValues = { name: '', phone: '' }

export function QuickCreateContact({
  open,
  onOpenChange,
  onCreated,
}: QuickCreateContactProps) {
  const createMutation = useCreateContact()
  const form = useForm<QuickCreateValues>({
    resolver: zodResolver(QuickCreateSchema),
    mode: 'onBlur',
    defaultValues: EMPTY_VALUES,
  })
  function handleSubmit(values: QuickCreateValues) {
    createMutation.mutate(
      {
        name: values.name,
        phone: values.phone,
        source: 'MANUAL',
        consentLgpd: true,
      },
      {
        onSuccess: (response) => {
          const responseBody = response.data
          if ('data' in responseBody && responseBody.data?.id) {
            onCreated(responseBody.data.id)
          }
          form.reset(EMPTY_VALUES)
          onOpenChange(false)
        },
      }
    )
  }
  function handleOpenChange(next: boolean) {
    if (!next) form.reset(EMPTY_VALUES)
    onOpenChange(next)
  }
  const errors = form.formState.errors
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Criar contato rápido</DialogTitle>
          <DialogDescription>
            Apenas nome e telefone. CPF/CNPJ pode ser informado depois.
          </DialogDescription>
        </DialogHeader>
        <DialogPanel>
          <FormProvider {...form}>
            <form
              id="quick-create-contact-form"
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-3"
              noValidate
            >
              <FormField label="Nome" error={errors.name?.message} required>
                <Input
                  placeholder="Nome do contato"
                  {...form.register('name')}
                />
              </FormField>
              <FormField
                label="Telefone"
                error={errors.phone?.message}
                required
              >
                <Input
                  placeholder="+55 (11) 99999-9999"
                  {...form.register('phone')}
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
            disabled={createMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="quick-create-contact-form"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending && (
              <Loader2 className="mr-2 size-4 animate-spin" />
            )}
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
