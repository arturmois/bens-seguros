'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'

import type { OrganizationData } from '../types'
import { useUpdateOrganization } from '../hooks/use-update-organization'

const organizationSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome deve ter no mínimo 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  slug: z
    .string()
    .min(2, 'Slug deve ter no mínimo 2 caracteres')
    .max(50, 'Slug deve ter no máximo 50 caracteres')
    .regex(
      /^[a-z0-9-]+$/,
      'Slug deve conter apenas letras minúsculas, números e hifens'
    ),
})

type OrganizationFormValues = z.infer<typeof organizationSchema>

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
    resolver: zodResolver(organizationSchema),
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
