'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Controller, FormProvider, useForm } from 'react-hook-form'

import { FormField } from '@/components/shared/form-field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

import { z } from 'zod'

import { CreateContactBody as CreateContactBaseSchema } from '@/api/endpoints/contacts/contacts.zod'

import { useCreateContact, useUpdateContact } from '../hooks/use-contacts'

// Local form schema overrides: treat empty `email` and `phone` as absent so
// users can submit with only one of them (the API invariant is `phone OR email`).
const emptyToUndef = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value

const CreateContactSchema = CreateContactBaseSchema.extend({
  email: z.preprocess(
    emptyToUndef,
    z.string().email('Email inválido').optional()
  ),
  phone: z.preprocess(emptyToUndef, z.string().optional()),
  notes: z.preprocess(emptyToUndef, z.string().optional()),
})
import { CONTACT_SOURCE_OPTIONS } from '../lib/constants'
import type {
  ContactSource,
  ContactWithStage,
  CreateContactValues,
} from '../lib/types'

interface ContactFormProps {
  readonly mode: 'create' | 'edit'
  readonly initial?: ContactWithStage
  readonly onSuccess?: (contactId: string) => void
  readonly onCancel?: () => void
}

const EMPTY_FORM_VALUES: CreateContactValues = {
  name: '',
  phone: '',
  email: '',
  source: 'MANUAL',
  consentLgpd: true,
  notes: '',
  tags: [],
}

function buildDefaultValues(initial?: ContactWithStage): CreateContactValues {
  if (!initial) return EMPTY_FORM_VALUES
  return {
    name: initial.name,
    phone: initial.phone ?? '',
    email: initial.email ?? '',
    source: initial.source,
    consentLgpd: initial.consentLgpd,
    notes: initial.notes ?? '',
    tags: initial.tags,
  }
}

export function ContactForm({
  mode,
  initial,
  onSuccess,
  onCancel,
}: ContactFormProps) {
  const router = useRouter()
  const createMutation = useCreateContact()
  const updateMutation = useUpdateContact()
  const isPending = createMutation.isPending || updateMutation.isPending

  const form = useForm<CreateContactValues>({
    resolver: zodResolver(CreateContactSchema),
    mode: 'onBlur',
    defaultValues: buildDefaultValues(initial),
  })

  useEffect(() => {
    if (initial) form.reset(buildDefaultValues(initial))
  }, [initial, form])

  function handleSubmit(values: CreateContactValues) {
    const sanitized: CreateContactValues = {
      ...values,
      phone: values.phone?.trim() ? values.phone.trim() : undefined,
      email: values.email?.trim() ? values.email.trim() : undefined,
      notes: values.notes?.trim() ? values.notes.trim() : undefined,
    }

    if (mode === 'edit' && initial) {
      updateMutation.mutate(
        {
          id: initial.id,
          data: {
            name: sanitized.name,
            phone: sanitized.phone ?? null,
            email: sanitized.email ?? null,
            notes: sanitized.notes ?? null,
            tags: sanitized.tags ?? [],
          },
        },
        {
          onSuccess: () => {
            onSuccess?.(initial.id)
            if (!onSuccess) router.push(`/contacts/${initial.id}`)
          },
        }
      )
      return
    }

    createMutation.mutate(sanitized, {
      onSuccess: (response) => {
        const responseBody = response.data
        if (!('data' in responseBody) || !responseBody.data?.id) return
        const newId = responseBody.data.id
        onSuccess?.(newId)
        if (!onSuccess) router.push(`/contacts/${newId}`)
      },
    })
  }

  function handleCancel() {
    if (onCancel) {
      onCancel()
      return
    }
    router.back()
  }

  const errors = form.formState.errors

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-6"
        noValidate
      >
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
          <FormField label="Nome" error={errors.name?.message} required>
            <Input placeholder="Nome do contato" {...form.register('name')} />
          </FormField>

          <FormField label="Origem" error={errors.source?.message} required>
            <Controller
              control={form.control}
              name="source"
              render={({ field }) => (
                <Select
                  value={field.value ?? 'MANUAL'}
                  onValueChange={(value) => {
                    if (value !== null) field.onChange(value as ContactSource)
                  }}
                  items={CONTACT_SOURCE_OPTIONS}
                  disabled={mode === 'edit'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a origem">
                      {(value: string | null) => {
                        const item = CONTACT_SOURCE_OPTIONS.find(
                          (option) => option.value === value
                        )
                        return item?.label ?? null
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {CONTACT_SOURCE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <FormField label="Telefone" error={errors.phone?.message}>
            <Input
              placeholder="+55 (11) 99999-9999"
              {...form.register('phone')}
            />
          </FormField>

          <FormField label="Email" error={errors.email?.message}>
            <Input
              type="email"
              placeholder="contato@example.com"
              {...form.register('email')}
            />
          </FormField>
        </div>

        <FormField label="Anotações" error={errors.notes?.message}>
          <Textarea
            placeholder="Observações internas"
            {...form.register('notes')}
          />
        </FormField>

        <div className="flex items-center gap-3">
          <Controller
            control={form.control}
            name="consentLgpd"
            render={({ field }) => (
              <Switch
                checked={field.value === true}
                onCheckedChange={field.onChange}
                aria-labelledby="consent-lgpd-label"
              />
            )}
          />
          <Label id="consent-lgpd-label">Consentimento LGPD</Label>
        </div>
        {errors.consentLgpd?.message ? (
          <p role="alert" className="text-destructive text-sm">
            {errors.consentLgpd.message}
          </p>
        ) : null}

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {mode === 'create' ? 'Criar contato' : 'Salvar alterações'}
          </Button>
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}
