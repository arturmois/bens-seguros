'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import type { z } from 'zod'

import { UpdateOrganizationBody } from '@/api/endpoints/organization/organization.zod'
import { FormActions } from '@/components/shared/form-actions'
import { FormField } from '@/components/shared/form-field'
import { FormGrid } from '@/components/shared/form-grid'
import { FormSection } from '@/components/shared/form-section'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { useUpdateOrganization } from '../hooks/use-update-organization'
import type { OrganizationData } from '../types'

type OrganizationFormValues = z.infer<typeof UpdateOrganizationBody>

interface OrganizationFormProps {
  readonly organization: OrganizationData
  readonly isReadOnly: boolean
}

export function OrganizationForm({
  organization,
  isReadOnly,
}: OrganizationFormProps) {
  const updateOrganization = useUpdateOrganization()
  const form = useForm<OrganizationFormValues>({
    resolver: zodResolver(UpdateOrganizationBody),
    mode: 'onBlur',
    defaultValues: {
      name: organization.name,
      slug: organization.slug,
    },
  })
  useEffect(() => {
    if (form.formState.isDirty) return
    form.reset({
      name: organization.name,
      slug: organization.slug,
    })
  }, [organization.name, organization.slug, form])
  function handleSubmit(values: OrganizationFormValues) {
    updateOrganization.mutate(values)
  }
  const isPending = updateOrganization.isPending
  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-8"
        noValidate
      >
        <FormSection title="Identificação">
          <FormGrid columns={2}>
            <FormField
              label="Nome da organização"
              error={form.formState.errors.name?.message}
              required
            >
              <Input
                placeholder="Minha Corretora"
                disabled={isReadOnly}
                {...form.register('name')}
              />
            </FormField>
            <FormField
              label="Slug"
              error={form.formState.errors.slug?.message}
              hint="Identificador único usado na URL. Apenas letras minúsculas, números e hifens."
              required
            >
              <Input
                placeholder="minha-corretora"
                disabled={isReadOnly}
                {...form.register('slug')}
              />
            </FormField>
          </FormGrid>
        </FormSection>
        {!isReadOnly && (
          <FormActions>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </FormActions>
        )}
      </form>
    </FormProvider>
  )
}
