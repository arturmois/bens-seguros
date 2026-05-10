'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import type { z } from 'zod'

import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { UpdateOrganizationBody } from '@/api/endpoints/organization/organization.zod'

import type { OrganizationData } from '../types'
import { useUpdateOrganization } from '../hooks/use-update-organization'

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
    defaultValues: {
      name: organization.name,
      slug: organization.slug,
    },
  })
  useEffect(() => {
    form.reset({
      name: organization.name,
      slug: organization.slug,
    })
  }, [organization.name, organization.slug, form])
  function handleSubmit(values: OrganizationFormValues) {
    updateOrganization.mutate(values)
  }
  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
        helperText="Identificador único usado na URL. Apenas letras minúsculas, números e hifens."
        required
      >
        <Input
          placeholder="minha-corretora"
          disabled={isReadOnly}
          {...form.register('slug')}
        />
      </FormField>
      {!isReadOnly && (
        <div className="pt-2">
          <Button type="submit" disabled={updateOrganization.isPending}>
            {updateOrganization.isPending && (
              <Loader2 className="mr-2 size-4 animate-spin" />
            )}
            {updateOrganization.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      )}
    </form>
  )
}
