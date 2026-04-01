'use client'

import type { UseFormReturn } from 'react-hook-form'
import type { z } from 'zod'

import { Input } from '@/components/ui/input'

import { CreateClientBody } from '@/api/endpoints/clients/clients.zod'
import { FormField } from './form-field'

type ClientFormValues = z.infer<typeof CreateClientBody>

interface SocialMediaFieldsProps {
  readonly form: UseFormReturn<ClientFormValues>
  readonly isReadOnly?: boolean
}

export function SocialMediaFields({
  form,
  isReadOnly,
}: SocialMediaFieldsProps) {
  return (
    <div className="pt-2">
      <p className="mb-3 text-sm font-medium">Redes Sociais</p>
      <div className="space-y-3">
        <FormField
          label="Instagram"
          error={form.formState.errors.socialMedia?.instagram?.message}
        >
          <Input
            placeholder="@perfil"
            disabled={isReadOnly}
            {...form.register('socialMedia.instagram')}
          />
        </FormField>

        <FormField
          label="Facebook"
          error={form.formState.errors.socialMedia?.facebook?.message}
        >
          <Input
            placeholder="URL ou nome do perfil"
            disabled={isReadOnly}
            {...form.register('socialMedia.facebook')}
          />
        </FormField>

        <FormField
          label="LinkedIn"
          error={form.formState.errors.socialMedia?.linkedin?.message}
        >
          <Input
            placeholder="URL do perfil"
            disabled={isReadOnly}
            {...form.register('socialMedia.linkedin')}
          />
        </FormField>

        <FormField
          label="TikTok"
          error={form.formState.errors.socialMedia?.tiktok?.message}
        >
          <Input
            placeholder="@perfil"
            disabled={isReadOnly}
            {...form.register('socialMedia.tiktok')}
          />
        </FormField>
      </div>
    </div>
  )
}
