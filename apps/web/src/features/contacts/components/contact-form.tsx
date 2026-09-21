'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { InputMask } from '@react-input/mask'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { FormActions } from '@/components/shared/form-actions'
import { FormField } from '@/components/shared/form-field'
import { FormGrid } from '@/components/shared/form-grid'
import { FormSection } from '@/components/shared/form-section'
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

import { formatPhoneForMask, PHONE_MASK } from '@/lib/masks'

const emptyToUndef = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value

const CreateContactSchema = CreateContactBaseSchema.extend({
  email: z.preprocess(
    emptyToUndef,
    z.string().email('Email inválido').optional()
  ),
  notes: z.preprocess(emptyToUndef, z.string().optional()),
  phone: z
    .string()
    .trim()
    .refine(
      (value) => value.replace(/\D/g, '').length === 13,
      'Telefone incompleto'
    ),
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
  readonly hideFooter?: boolean
  readonly formId?: string
  readonly onPendingChange?: (pending: boolean) => void
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
    phone: formatPhoneForMask(initial.phone),
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
  hideFooter,
  formId,
  onPendingChange,
}: ContactFormProps) {
  const router = useRouter()
  const createMutation = useCreateContact()
  const updateMutation = useUpdateContact()
  const isPending = createMutation.isPending || updateMutation.isPending
  const form = useForm<CreateContactValues>({
    resolver: zodResolver(CreateContactSchema),
    mode: 'onSubmit',
    values: buildDefaultValues(initial),
    resetOptions: { keepDirtyValues: true },
  })
  useEffect(() => {
    onPendingChange?.(isPending)
  }, [isPending, onPendingChange])
  function handleSubmit(values: CreateContactValues) {
    const sanitized: CreateContactValues = {
      ...values,
      phone: values.phone.trim(),
      email: values.email?.trim() ? values.email.trim() : undefined,
      notes: values.notes?.trim() ? values.notes.trim() : undefined,
    }
    if (mode === 'edit' && initial) {
      updateMutation.mutate(
        {
          id: initial.id,
          data: {
            name: sanitized.name,
            phone: sanitized.phone,
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
        const newId = 'data' in responseBody ? responseBody.data?.id : undefined
        if (!newId) {
          toast.error('Resposta inesperada do servidor ao criar contato')
          return
        }
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
        id={formId}
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-8"
        noValidate
      >
        <FormSection title="Identificação">
          <FormGrid>
            <FormField label="Nome" error={errors.name?.message} required>
              <Input placeholder="Nome do contato" {...form.register('name')} />
            </FormField>
            <FormField label="Telefone" error={errors.phone?.message} required>
              <Controller
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <InputMask
                    component={Input}
                    mask={PHONE_MASK.mask}
                    replacement={PHONE_MASK.replacement}
                    placeholder="+55 (11) 99999-9999"
                    {...field}
                    value={String(field.value ?? '')}
                  />
                )}
              />
            </FormField>
            <FormField label="Email" error={errors.email?.message}>
              <Input
                type="email"
                placeholder="contato@example.com"
                {...form.register('email')}
              />
            </FormField>
          </FormGrid>
        </FormSection>
        <FormSection title="Origem e consentimento">
          <FormGrid>
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
            {/* Switch + Label com aria-labelledby nao encaixa no FormField (label acima do controle); mantemos layout custom dentro do grid via col-span-full */}
            <div className="col-span-full">
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
                <p role="alert" className="mt-2 text-destructive text-sm">
                  {errors.consentLgpd.message}
                </p>
              ) : null}
            </div>
          </FormGrid>
        </FormSection>
        <FormSection title="Observações">
          <FormGrid>
            <FormField
              label="Anotações"
              error={errors.notes?.message}
              span="full"
            >
              <Textarea
                placeholder="Observações internas"
                {...form.register('notes')}
              />
            </FormField>
          </FormGrid>
        </FormSection>
        {!hideFooter && (
          <FormActions>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {mode === 'create' ? 'Criar contato' : 'Salvar alterações'}
            </Button>
          </FormActions>
        )}
      </form>
    </FormProvider>
  )
}
